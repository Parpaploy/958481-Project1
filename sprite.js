class Sprite{
	constructor(options){
		this.game = options.game;
		this.context = options.context;
		this.width = options.width;
		this.height = options.height;
		this.image = options.image;
		this.json = options.json;
		this.index = options.index;
		this.x = options.x;
		this.y = options.y;
		this.frameData = options.frameData;
		this.anchor = (options.anchor==null) ? { x:0.5, y:0.5 } : options.anchor;
		this.states = options.states;
		this.state = this.states.spawn; 
		this.scale = (options.scale==null) ? 1.0 : options.scale;
		this.opacity = (options.opacity==null) ? 1.0 : options.opacity;
		this.currentTime = 0;
		this.kill = false;
	}

	set state(value){
		this.currentTime = 0;
		this._state = value;
	}
	
	get state(){
		if (this._state==undefined) this.state = this.states.static;
		return this._state;
	}
	
	initDrop(y){
		this.state = this.states.drop;	
		this.targetY = y;
		this.game.dropInfo.total++;
	}
	
	update(dt){
		const state = this.state;
		
		this.currentTime += dt;
		let delta = this.currentTime/state.duration;
		if (delta>=1){
			if (state==this.states.die){
				if (!this.kill) this.game.removeInfo.count++;
				this.kill = true;
			}
			if (state==this.states.spawn){
				this.state = this.states.static;
				this.game.spawnInfo.count++;
			}
			delta = 1;
		}
		
		switch(state){
			case this.states.spawn:
				//scale and fade in
				this.scale = delta;
				this.opacity = delta;
				this.frameData = this.game.spriteData.frames[5];
				break;
			case this.states.static:
				this.scale = 1.0;
				this.opacity = 1.0;
				this.frameData = this.game.spriteData.frames[this.index];
				break;
			case this.states.die:
				this.scale = 1.0 + delta;
				this.opacity = 1.0 - delta;
				this.frameData = this.game.spriteData.frames[5];
				break;
			case this.states.drop:
				this.y += (state.moveY * dt);
				if (this.y>this.targetY){
					this.y = this.targetY;
					this.state = this.states.static;
					this.game.dropInfo.count++;
				}
				this.frameData = this.game.spriteData.frames[this.index];
				break;
		}
	}
		
	render() {
		// Draw the animation
		const alpha = this.context.globalAlpha;
			
		this.context.globalAlpha = this.opacity;

		this.context.drawImage(
		   this.image,
		   this.frameData.frame.x,
		   this.frameData.frame.y,
		   this.frameData.frame.w,
		   this.frameData.frame.h,
		   this.x - (this.width - this.frameData.spriteSourceSize.x) * this.scale * this.anchor.x,
		   this.y - (this.height - this.frameData.spriteSourceSize.y) * this.scale * this.anchor.y,
		   this.frameData.frame.w * this.scale,
		   this.frameData.frame.h * this.scale
		);

		this.context.globalAlpha = alpha;
	};
		
	distanceBetweenPoints(a, b){
		const x = a.x - b.x;
		const y = a.y - b.y;

		return Math.sqrt(x * x + y * y);
	}
		
	hitTest(pt){
		const centre = { x: this.x, y: this.y };
		const radius = (this.width * this.scale) / 2;
		//Now test if the pt is in the circle
		const dist = this.distanceBetweenPoints(pt, centre);

		return dist<radius;
	}
}

