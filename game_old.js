// JavaScript Document
class Game{
	constructor(){
		this.canvas = document.getElementById("game");
		this.context = this.canvas.getContext("2d");
		this.lastRefreshTime = Date.now();
		this.sinceLastSpawn = 0;
		this.sprites = [];
		this.score = 0;
		this.spriteData;
		this.spriteImage;
		this.flowers = [];

		this.bear;
		this.buttons = [];
		this.ui = [];
		this.level = 9;
		this.debug = false;
		this.font = '30px Verdana';
		this.txtoptions = {
			alignment: "center",
			font: 'Verdana',
			fontSize: 12,
			lineHeight: 15,
			color: "#fff"
		}

		this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		this.correctSfx = new SFX({
			context: this.audioContext,
			src:{mp3:"gliss.mp3", webm:"gliss.webm"},
			loop: false,
			volume: 0.3
		});
		this.wrongSfx = new SFX({
			context: this.audioContext,
			src:{mp3:"boing.mp3", webm:"boing.webm"},
			loop: false,
			volume: 0.3
		});
		this.dropSfx = new SFX({
			context: this.audioContext,
			src:{mp3:"swish.mp3", webm:"swish.webm"},
			loop: false,
			volume: 0.3
		});

		const game = this;
		const options = {
			assets:[
				"beargame.json",
				"beargame.png"
			],
			oncomplete: function(){
				const progress = document.getElementById('progress');
				progress.style.display = "none";
				game.load();
			},
			onprogress: function(value){
				const bar = document.getElementById('progress-bar');
				bar.style.width = `${value*100}%`;
			}
		}

		const preloader = new Preloader(options);
	}

	load(){
		const game = this;
		this.loadJSON("Jewery data", function(data, game){
			game.spriteData = JSON.parse(data);
			game.spriteImage = new Image();
			game.spriteImage.src = game.spriteData.meta.image;
			game.spriteImage.onload = function(){	
				game.init();
			}
		})
	}
	
	loadJSON(json, callback) {   
		const xobj = new XMLHttpRequest();
			  xobj.overrideMimeType("application/json");
			  xobj.open('GET', json + '.json', true);
		const game = this;
		xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == "200") {
				callback(xobj.responseText, game);
			  }
		};
		xobj.send(null);  
	}
	
	init(){
		const sourceSize = this.spriteData.frames[0].sourceSize;
		this.gridSize = { rows:9, cols:10, width:sourceSize.w, height:sourceSize.h };
		const topleft = { x:100, y:40 };
		this.spawnInfo = { count:0, total: 0 }
		this.flowers = [];
		for(let row=0; row<this.gridSize.rows; row++){
			let y = row*this.gridSize.height + topleft.y;
			this.flowers.push([]);
			for(let col=0; col<this.gridSize.cols; col++){
				let x = col * this.gridSize.width + topleft.x;
				const sprite = this.spawn(x,y);
				this.flowers[row].push(sprite)
				this.spawnInfo.total++;
			}
		}

		const msgoptions = {
			game: this,
			frame: "msg_panel{04}.png",
			index: 3,
			center: true,
			scale: 1.0,
		}
		this.msgPanel = new Sprite("msgPanel", msgoptions);
		

		this.gridSize.topleft = topleft;
		const game = this;
		if ('ontouchstart' in window){
			this.canvas.addEventListener("touchstart", function(event){ game.tap(event); });
		}else{
			this.canvas.addEventListener("mousedown", function(event){ game.tap(event); });
		}
		this.state = "spawning";
		//this.state = "initialised";
		this.refresh();
	}
	
	refresh() {
		const now = Date.now();
		const dt = (now - this.lastRefreshTime) / 1000.0;

		this.update(dt);
		this.render();

		this.lastRefreshTime = now;
		
		const game = this;
		requestAnimationFrame(function(){ game.refresh(); });
	};
	
	update(dt){
		let removed;
		do{
			removed = false;
			let i=0;
			for(let sprite of this.sprites){
				if (sprite.kill){
					this.sprites.splice(i, 1);
					this.clearGrid(sprite);
					removed = true;
					break;
				}
				i++;
			}
		}while(removed);
		
		switch(this.state){
			case "spawning":
				if (this.spawnInfo.count == this.spawnInfo.total){
					delete this.spawnInfo;
					this.state = "ready";
				}
				break;
			case "removing":
				if (this.removeInfo.count == this.removeInfo.total){
					delete this.removeInfo;
					this.removeGridGaps();
					this.state = "dropping";
					this.dropSfx.play();
				}
				break;
			case "dropping":
				if (this.dropInfo.count == this.dropInfo.total){
					delete this.dropInfo;
					this.state = "ready";
				}
				break;
			case "initialised":
				this.msgPanel.index = 3;
				dt=0;
				break;
			case "instructions2":
				this.msgPanel.index = 3;
				dt=0;
				break;
		}
		
		for(let sprite of this.sprites){
			if (sprite==null) continue;
			sprite.update(dt);
		}
	}
	
	spawn(x, y){
		const index = Math.floor(Math.random() * 5);
		const frameData = this.spriteData.frames[index];
		const s = new Sprite({
			game: this,
			context: this.context,
			x: x,
			y: y,
			index: index,
			width: frameData.sourceSize.w,
			height: frameData.sourceSize.h,
			frameData: frameData,	
			anchor: { x:0.5, y:0.5 },
			image: this.spriteImage,
			json: this.spriteData,
			states: { 
				spawn:{ duration: 0.5 }, 
				static:{ duration:1.5}, 
				die:{ duration:0.8}, 
				drop:{ moveY:450 } }
		});
		
		this.sprites.push(s);
		this.sinceLastSpawn = 0;
		
		return s;
	}
	
	render(){
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		for(let sprite of this.sprites) sprite.render();
		
		this.context.font="20px Verdana";
		this.context.fillStyle = "#999";
		let str = "Score";
		let txt = this.context.measureText(str);
		let left = (this.gridSize.topleft.x - 32 - txt.width)/2;
		this.context.fillText("Score", left, 30);
		this.context.font="30px Verdana";
		this.context.fillStyle = "#333";
		str = String(this.score);
		txt = this.context.measureText(str);
		left = (this.gridSize.topleft.x - 32 - txt.width)/2;
		this.context.fillText(this.score, left, 65);

		if (this.state == "initialised"){
			// Wait for user to start the game
			this.msgPanel.update();
			this.msgPanel.render();
			const bb = this.msgPanel.boundingBox;
			const padding = new Vertex(10, 100);
			bb.x += padding.x;
			bb.y += padding.y;
			bb.w -= padding.x*2;
			this.txtoptions.fontSize = 15;
			this.txtoptions.lineHeight = 17;
			const blockText = new TextBlock(this.context, "Use the arrow buttons to control the polar bear. The aim is to cross the iceflow by jumping from iceberg to iceberg.", bb, this.txtoptions);
		}else if (this.state=="instructions2"){
			this.msgPanel.update();
			this.msgPanel.render();
			const bb = this.msgPanel.boundingBox;
			const padding = new Vertex(10, 100);
			bb.x += padding.x;
			bb.y += padding.y;
			bb.w -= padding.x*2;
			this.txtoptions.fontSize = 15;
			this.txtoptions.lineHeight = 17;
			const blockText = new TextBlock(this.context, "Fall in the water or disappear off the sides and you lose a life. Collect fish to gain a life\n Click to start.", bb, this.txtoptions);
	
			}	
		}
	
	getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = { x: this.canvas.width/rect.width, y: this.canvas.height/rect.height };
		const clientX = evt.targetTouches ? evt.targetTouches[0].clientX : evt.pageX;
		const clientY = evt.targetTouches ? evt.targetTouches[0].clientY : evt.pageY;
        return {
          x: (clientX - rect.left) * scale.x,
          y: (clientY - rect.top) * scale.y
        };
      }

	  tap (evt) {
		if (this.state=="initialised"){
			this.state = "instructions2";
		}else if (this.state=="instructions2"){
			this.startGame();
		}

		if (this.state!="ready") return;

		const mousePos = this.getMousePos(evt);
		const canvasScale = this.canvas.width / this.canvas.offsetWidth;
		const loc = {};

		loc.x = mousePos.x * canvasScale;
		loc.y = mousePos.y * canvasScale;

		for (let sprite of this.sprites) {
			if (sprite.hitTest(loc)){
			//Need to find this sprite in the flowers grid
			let row, col, found=false;
			//First put flags to show if they have been checked
			for(let sprite of this.sprites) sprite.checked = false;
			let i=0;
			for(row of this.flowers){
				col = row.indexOf(sprite);
				if (col!=-1){
				//Found it
				row = i;
				found=true;
				break;
			}
			i++;
		}
		if (found){
			const connected = this.getConnectedSprites(sprite.index, row, col);
			if (connected.length >= 3){
				this.correctSfx.play();
				for(let sprite of connected){
					sprite.state = sprite.states.die;
				}
				// Purple
			if(sprite.index == 0){
				this.score += (connected.length) * 2;
			}
			// Green
			else if(sprite.index == 1){
				this.score += (connected.length) * 1;
			}
			// Rainbow
			else if(sprite.index == 2){
				this.score += (connected.length) * 5;
			}
			// Bomb
			else if(sprite.index == 3){
				this.score += (connected.length) * -2;
				this.life -= 1;
			}
			// Blue
			else if(sprite.index == 4){
				this.score += (connected.length) * 3;
			}
			//this.score += connected.length;
			this.state = "removing";
			this.removeInfo = { count:0, total:connected.length };
		}else{
			this.wrongSfx.play();
					}
				}
			}
		}
	}

	getConnectedSprites(index, row, col, connected = []) {
		const sprite = this.flowers[row][col];
		const grid = this.flowers;
	
		try {
			if (sprite.index === index && !sprite.checked) {
				connected.push(sprite);
				sprite.checked = true;
	
				// Check the orthogonal neighbors only
				const directions = [
					{ r: row - 1, c: col },     // up
					{ r: row + 1, c: col },     // down
					{ r: row, c: col - 1 },     // left
					{ r: row, c: col + 1 }      // right
				];
	
				for (const dir of directions) {
					if (boundaryCheck(dir.r, dir.c)) {
						this.getConnectedSprites(index, dir.r, dir.c, connected);
					}
				}
			}
		} catch (e) {
			console.log(`Problem with ${row}, ${col}`);
		}
	
		console.log(`getConnectedSprites ${row}, ${col}, ${connected.length}`);
		return connected;
	
		function boundaryCheck(row, col) {
			if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;
			return true;
		}
	}

	removeGridGaps(){
		this.dropInfo = { count:0, total: 0 };

		for(let col=0; col<this.flowers[0].length; col++){
			let row;
			let count;
			for(row=this.flowers.length-1; row>=0; row--){
				if (this.flowers[row][col]==null){
					//Find the first non-null cell above and pull it down to this cell
					count = 0;
					for(let r=row-1; r>=0; r--){
						var sprite = this.flowers[r][col];
						count++;
						if (sprite!=null){
							//Swap the array items
							[this.flowers[row][col], this.flowers[r][col]] = [this.flowers[r][col], this.flowers[row][col]];
							sprite.initDrop(this.gridSize.topleft.y + this.gridSize.height * row);
							break;
						}
					}
				}
			}
			for(row=this.flowers.length-1; row>=0; row--){
				if (this.flowers[row][col]==null){
				break;
				}
			}
			for(let r=row; r>=0; r--){
				let x = col*this.gridSize.width + this.gridSize.topleft.x;
				let y = this.gridSize.topleft.y - this.gridSize.height * (row - r + 1);
				const sprite = this.spawn(x, y);
				this.flowers[r][col] = sprite;
				sprite.initDrop(this.gridSize.topleft.y + r * this.gridSize.height);
			}
		}
	}

	clearGrid(sprite){
		for(let row of this.flowers){
			let col = row.indexOf(sprite);
			if (col!=-1){
				//Found it
				row[col]=null;
				return true;
			}
		}
		return false;//sprite not found
	}

	startGame(){
		this.startTime = Date.now();
		this.state = "ready";
	}
}