/* A Sprite is an individual image from the spritesheet */
class Sprite2 {
				
	constructor(name, options){
		this.name = name;
		this.x = (options.x==null) ? 0 : options.x;
		this.y = (options.y==null) ? 0 : options.y;
		this.debug = (options.debug==undefined) ? false : options.debug;
		this.game = (options.game!=undefined) ? options.game : null;
		if (this.game != null){
			this.frames = this.game.spriteData.frames;	
			this.frameName = options.frame;
			if (options.index!=undefined){
				this.index = options.index;
			}else{
				this.frame = this.getFrame(options.frame);
			}
			this.context = this.game.context;
			this.image = this.game.spriteImage;
			if (options.center!=null && options.center){
				this.x = this.game.canvas.width/2;
				this.y = this.game.canvas.height/2;
			}
		}else{
			if (Array.isArray(options.frameData)){
				this.frames = options.frameData;
				this.frame = this.setFrame(options.frame);
			}else{
				this.frame = this.frameData.frame;
			}
			this.context = options.context;
			this.image = options.image;
		}
		this.anchor = (options.anchor==null) ? { x:0.5, y:0.5 } : options.anchor;
		this.scale = (options.scale==null) ? 1.0 : options.scale;
		this.opacity = (options.opacity==null) ? 1.0 : options.opacity;
		this.rotation = (options.rotation==null) ? 0 : options.rotation;
		this.zOrder = 0;
		this.className = "Sprite";
		
		if (options.node!=null){//Used for cut-out animation
			this.node = options.node;
			if (options.config!=null){
				let config = options.config;
				if (options.parent!=null){
					if (config.position!=null){
						this.x = Number(config.position.x);
						this.y = Number(config.position.y);
					} 
				}
				if (config.anchor!=null){
					this.anchor = { x:Number(config.anchor.x), y:Number(config.anchor.y) };
				}
				if (config.scale!=null) this.scale = Number(config.scale);
				if (config.rotation!=null) this.rotation = Number(config.rotation);
				if (config.zOrder!=null) this.zOrder = Number(config.zOrder);
				if (config.opacity!=null) this.opacity = Number(config.opacity);
			}
		}
		if (options.parent!=null) this.parent = options.parent;
		this.setRest(false);//Save the current position as the rest position
		this.children = [];
	}

	addChild(child){
		this.children.push(child);
	}
	
	get index(){
		return this._index;
	}
	
	set index(value){
		//It is assumed that this._frame is in the format imagename{0x}.png where x is the number of 0s
		//to add and {04} becomes 0001 if index=1 or 0023 if index=23
		if (this.game==undefined && !this.frames.isArray()){
			console.error("Sprite trying to set index when there is no access to the frames array");
		}
		if (this.frameName==null){
			console.error("Sprite trying to set index when _frame is null");
			return; //We can't do anything
		}
		const formatPos = { start:this.frameName.indexOf("{") };
		if (formatPos.start==-1){
			console.error("Sprite trying to set index when _frame does not contain formatting information")
			return; //Not correct formatting
		}
		formatPos.end = this.frameName.indexOf("}");
		if (formatPos.end==-1){
			console.error("Sprite trying to set index when _frame does not contain correnct formatting information")
			return; //Not correct formatting
		}
		let formatStr = this.frameName.substring(formatPos.start+1, formatPos.end);
		if (formatStr.startsWith('0')){
			formatStr = formatStr.substring(1);
			const count = Number(formatStr);
			const str = this.frameName.substr(0, formatPos.start);
			let suffix = String(value);
    		while (suffix.length < count) suffix = "0" + suffix;
    		const ext = this.frameName.substr(formatPos.end+1);
			const frameName = str + suffix + ext;
			this.frame = this.getFrame(frameName);
		}
		this._index = value;
	}
	
	getFrame(name){
		let frame;
		let found = false;
		for(frame of this.frames){
			if (frame.filename == name){
				found = true;
				break;
			}
		}
		if (!found) return null;
		return frame.frame;
	}
	
	get offset(){
		let scale = this.getScale();
		let result;
		try{
			result = new Vertex( this.frame.w * scale * this.anchor.x, this.frame.h * scale * this.anchor.y);
		}catch(e){
			console.log("Sprite.offset null error");
			result = new Vertex(0,0);
		}
		return result;
	}
	
	get position(){
		return new Vertex(this.matrix.e, this.matrix.f);	
	}
	
	get boundingBox(){
		let pt = this.position;
		let w = this.frame.w * this.scale;
		let h = this.frame.h * this.scale;
		pt.x -= w * this.anchor.x;
		pt.y -= h * this.anchor.y;
		return new Rect(pt.x, pt.y, w, h);
	}
	
	 get config(){
		let json;
		 if (this.rest!=null){
			json = { nodeName: this.node.name,
					 anchor:this.anchor,
					 position:this.rest.position,
					 scale:this.rest.scale,
					 rotation:this.rest.rotation,
					 opacity:this.rest.opacity,
				     zOrder:this.zOrder } 
		 }else{
		 	json = { nodeName: this.node.name,
					 anchor:this.anchor,
					 position:{x:this.x, y:this.y},
					 scale:this.scale,
					 rotation:this.rotation,
					 opacity:this.opacity,
				     zOrder:this.zOrder }
	 	}
		if (this.children!=null && this.children.length>0){
			json.children = []
			for (let i=0; i<this.children.length; i++){
				json.children.push(this.children[i].config);
			}
		}
		return json;
	}
	
	getRotation(){
		let rotation = this.rotation;
		if (this.parent!=null){
			rotation += this.parent.getRotation();
		}
		return rotation;
	}
	
	getScale(){
		let scale = this.scale;
		if (this.parent!=null){
			scale *= this.parent.getScale();
		}
		return scale;
	}
	
	hitTest(pt){
		const bb = this.boundingBox;
		return (pt.x>=bb.x && pt.x<(bb.x+bb.w) && pt.y>=bb.y && pt.y<(bb.y + bb.h));
	}
	
	update(dt){
		// Draw the animation
		let a = Math.cos(this.rotation);
		let b = Math.sin(this.rotation);
		this.matrix = new Matrix(a*this.scale,b,-b,a*this.scale,this.x,this.y);
		if (this.parent!=null) this.matrix.mult(this.parent.matrix);
		for (let i=0; i<this.children.length; i++){
			let child = this.children[i];
			this.children[i].update(dt);
		}
	}
	
	setRest(restore=true){
		//Animations are from the rest position
		if (restore){
			if (this.rest!=null){
				this.frame = this.frames[this.rest.imageIndex];
				this.x = this.rest.position.x;
				this.y = this.rest.position.y;
				this.scale = this.rest.scale;
				this.rotation = this.rest.rotation;
				this.opacity = this.rest.opacity;
			}
		}else{
			this.rest = {};
			if (this.frame.index==undefined){
				let index = 0;
				for(let frame of this.frames){
					frame.index = index++;
				}
			}
			this.rest.imageIndex = this.frame.index;
			this.rest.position = { x:this.x, y:this.y }
			this.rest.scale = this.scale;
			this.rest.rotation = this.rotation;
			this.rest.opacity = this.opacity;
		}
	}
	
	render(context=this.context, flipped=false) {
		let offset = this.offset;
		let rotation = this.getRotation();
		let scale = this.getScale();
		let alpha = context.globalAlpha;
		
		context.globalAlpha = this.opacity;
		
		if (flipped){
			context.save();

			context.translate(this.matrix.e, this.matrix.f);
			context.rotate(rotation);
			context.drawImage(
			   this.flippedImage,
			   this.flippedImage.width - this.frame.x - this.frame.w,
			   this.frame.y,
			   this.frame.w,
			   this.frame.h,
			   -offset.x,
			   -offset.y,
			   this.frame.w * scale,
			   this.frame.h * scale
			);

			context.restore();
		}else{
			if (rotation!=0){
				context.save();

				context.translate(this.matrix.e, this.matrix.f);
				context.rotate(rotation);
				context.drawImage(
				   this.image,
				   this.frame.x,
				   this.frame.y,
				   this.frame.w,
				   this.frame.h,
				   -offset.x,
				   -offset.y,
				   this.frame.w * scale,
				   this.frame.h * scale
				);

				context.restore();
			}else{
				context.drawImage(
				   this.image,
				   this.frame.x,
				   this.frame.y,
				   this.frame.w,
				   this.frame.h,
				   this.matrix.e - offset.x,
				   this.matrix.f - offset.y,
				   this.frame.w * scale,
				   this.frame.h * scale
				);
			}
		}
		
		if (this.debug){
			this.context.strokeStyle = "#fff";
			const bb = this.boundingBox;
			this.context.strokeRect(bb.x, bb.y, bb.w, bb.h);
		}
		
		context.globalAlpha = alpha;
	}
}