/**
 * Sokoban
 */

j5g3.ready(function() {
var 
	loader = j5g3.loader(),

	ASSETS = {
		spritesheet: loader.img('spritesheet.png'),
		spritesheet_player: loader.img('spritesheet-player.png'),
		splash: loader.img('splash.png'),
		background: loader.img('background.jpg')
	},

	LEVELS= [
		
	"  #####  \n###   ###\n#  $..$ #\n# # ##  #\n# # ##@##\n#  $..$# \n### #$ # \n  # . .# \n  #$# .# \n  #  $ # \n  ###  # \n    #### \n",
	"###################\n#   ...  @  ...   #\n# $$$  #####  $$$ #\n##   ###   ###   ##\n ##  #       ##  #\n  ####        ####\n",
	"  ####\n###  ##\n#   $ #\n# #.#@#\n# #$ .#\n#  .$ #\n##   ##\n #####\n",
	"  #####\n###   ###\n# . $ . #\n# #.$.# #\n# $ # $ #\n### @ ###\n  #####",
	"  #####\n  #   ###\n###.#   #\n# $.$ # #\n# #* $  #\n#@ . ####\n######",
	"  #####\n  #   ##\n###$   ##\n#  .$.$ #\n# #.#.# #\n#  *$*  #\n###   ###\n  # @ #\n  #####",
	"  #####  \n  #   #  \n### #$#  \n#  .$.###\n# #$+$  #\n#  .$ # #\n### #.  #\n  #   ###\n  #####  ",
	"###########\n#@$   ....##\n# $$$$#....#\n# $  $..***##\n##   # ##.. #\n# $$$#  ##  #\n#    ## #  ##\n#  $$ #    #\n#     ###  #\n####### ####\n",
	" ######   \n##    ##\n#  ##  #\n# #  # #\n#.  .#$##\n# # * $ #\n# # * $@#\n#  .. $ #\n#########",
	"####   \n#  ####  \n#     ###\n#  #$ . #\n## #.#$ #\n#  # @* #\n#   *  ##\n####  ##\n   ####"

	],

	// Tile Height, Width and Offset
	TH= 192,
	TW= 128,
	TO= -48,

	BOX = 24,
	PLAYER = 54,
	PLAYER_TARGET = 34,
	PLACED_BOX = 25,
	TARGET = 32,
	FREE = 33,
	WALLS = [ 0, 23],
	EMPTY = 71,

	/* Decorations */
	DOOR_WEST = 40,
	DOOR_EAST = 41,

	SPRITES = {
		0   : EMPTY,
		" " : FREE,
		'@' : PLAYER,
		"+" : PLAYER_TARGET,
		"." : TARGET, 
		// BOX
		"$" : FREE, 
		// PLACED BOX
		'*': FREE,
		// WALLS
		"l" : 11, "r": 10, "lr" : 10,
		"lt": 7, "lrt": 3, "rt":6,
		"lb": 8, "lrb": 1, "rb":5,
		"tb": 9, "t" : 12, "b": 9,
		"lrtb": 0, "rtb": 2, "ltb": 4,
		"desk": 14,
		"!": DOOR_WEST,
		"~": DOOR_EAST
	},

	////////////////////////////////////////
	//
	// Game Engine 
	//
	///////////////////////////////////////
	Sokoban = j5g3.Engine.extend({
		
		stage_settings: {
			width: 1280, height: 720
		},
		
		mice: null,
		spritesheet: null,
		
		scene: function(Scene)
		{
			this.stage.add(new Scene());
		},
		
		startFn: function()
		{
			this.mice = mice(this.stage.canvas);
			this.mice.module.mouse.capture_move = false;
			
			this.spritesheet = j5g3.spritesheet(ASSETS.spritesheet).grid(8,10);
			
			this.fps(32).run();
		}

	}),
	
	////////////////////////////
	//
	// ENTITIES
	//
	////////////////////////////

	Box = j5g3.gdk.Element.extend({

		mapX: null, 
		mapY: null,
		world: null,

		setup: function()
		{
			this.add(game.spritesheet.sprite(BOX));
			this.add_frame(game.spritesheet.sprite(PLACED_BOX));
		},
		
		after_push: function()
		{
			if (me.under === TARGET)
				this.go(1);
		},

		push: function(position)
		{
		var
			me = this
		;
			me.go(0);
			
			me.under = me.world.move_tile(me.mapX, me.mapY, position.x, position.y);
			me.mapX = position.x;
			me.mapY = position.y;
			
			game.stage.add(j5g3.tween({ 
				target: me,
				to: { x: position.mx, y: position.my }, 
				auto_remove: true, 
				duration: 10,
				on_remove: me.after_push.bind(me)
			}));
		}

	}),

	////////////////////////
	///
	/// SCENES
	///
	////////////////////////
	
	Splash = j5g3.gdk.Scene.extend({
		
		alpha: 0,
		
		transition_in: j5g3.fx.Animate.fade_in,
		transition_out: j5g3.fx.Animate.fade_out,
		
		do_remove: function()
		{
			this.remove();
			
			game.mice.on_fire = null;
			game.scene(Level);
		},

		setup: function()
		{
			game.mice.on_fire = this.do_remove.bind(this);
			
			this.add(j5g3.image(ASSETS.splash)
				.stretch(game.stage.width, game.stage.height)
			);
		}

	}),
	
	Level = j5g3.gdk.Scene.extend({

		currentLevel: 0,
		alpha: 0,
		
		transition_in: j5g3.fx.Animate.fade_in,
		transition_out: j5g3.fx.Animate.fade_out,
		
		world: null,
		
		restart: function(level)
		{
			if (level)
				this.currentLevel = level;

			this.world.load(LEVELS[this.currentLevel]);
			this.center();
		},
		
		on_move: function(ev)
		{
			this.world.player.move({
				up_left: 'nw',
				up_right: 'ne',
				down_left: 'sw',
				down_right: 'se'
			}[ev.direction]);
		},
		
		center: function()
		{
		/*var
			p = this.world.player,
			pos = this.world.to_iso(p.x, p.y)
		;
			this.add(j5g3.tween({
				target: this.world,
				auto_remove: true,
				to: { 
					x: pos.x,
					y: pos.y
				}
			}));
			*/
		},
		

		setup: function()
		{
		var
			me = this,
			background = j5g3.image(ASSETS.background)
		;
			me.add([ 
				me.background = new j5g3.Stage({ 
					width: game.stage.width,
					height: game.stage.height,
					canvas: j5g3.id('background'),
					draw: j5g3.Draw.RootDirty 
				}),
				me.world = new World(),
			]);
			
			me.background.add(background);
			
			game.mice.move = this.on_move.bind(this);
			me.restart();
		}
		
	}),

	Player = j5g3.gdk.Element.extend({
		
		cx: 16,
		cy: 48,
		
		world: null,
		mapX: null,
		mapY: null,

		on_remove: function()
		{
			this.setMapXY();
			this.go_state('idle_' + this.direction); 
			this.moving = false;
			this.x = this.y = 0;
		},

		walk: function(position)
		{
			this.animateTo(
				position.mx, 
				position.my, 
				'walk_' + this.direction, 
				10, 
				this.on_remove
			);
		},

		push: function(pos)
		{
			this.animateTo(this.x + pos.mx/2, this.y + pos.my/2, 'walk_' + this.direction, 5, function() {
				this.animateTo(this.x, this.y, 'push_' + this.direction, 5, function() {
					this.world.get_box(pos.x, pos.y).push(pos);
					this.animateTo(this.x, this.y, 'push_' + this.direction, 5, function()
					{
						this.animateTo(this.x + pos.mx/2, this.y + pos.my/2, 'walk_' + this.direction, 5, this.on_remove);
					});
				});
			});

		},

		setMapXY: function()
		{
		var
			world = this.world,
			map   = world.walls.map,
			pos = world.getXY(this.mapX, this.mapY)
		;
		
			map[pos.y][pos.x] = this.previousTile || FREE;
			pos = world.getXY(this.nextPos.x, this.nextPos.y);
			
			this.previousTile = map[pos.y][pos.x];
			map[pos.y][pos.x] = PLAYER;
			
			this.mapX = this.nextPos.x;
			this.mapY = this.nextPos.y;
		},

		move: function(direction)
		{
			if (this.moving)
				return;
				
		var
			pos = this.check_direction(direction)
		;
			this.direction = direction;
			
			if (pos)
			{
				this.nextPos = pos;
				this[pos.action](pos);
			} else
				this.idle();
		},
		
		idle: function()
		{
			this.go_state('idle_' + this.direction);
		},

		animateTo: function(x, y, state, duration, on_remove)
		{
		var
			me = this
		;
			me.moving = true;
			me.go_state(state);

			game.stage.add(j5g3.tween({ 
				target: me,
				to: { x: x, y: y }, 
				auto_remove: true, 
				duration: duration || 10,
				on_remove: function() { 
					on_remove && on_remove.apply(me);
				} 
			}));
		},

		get_direction: function(direction, x, y)
		{
		var
			nx = x || this.mapX, 
			ny = y || this.mapY,
			mx = TW/2, my = TH/4
		;
			switch (direction)
			{
			case 'ne': ny--; my*=-1; break;
			case 'nw': nx--; mx*=-1; my*=-1; break;
			case 'se': nx++; break;
			case 'sw': ny++; mx*=-1; break;
			}

			return { 
				x: nx, y: ny, 
				mx: mx, my: my
			};
		},

		check_direction: function(direction)
		{
		var
			map = this.world.data,
			n = this.get_direction(direction), 
			nb, 
			sprite = map[n.y][n.x]
		;
			if (sprite >= WALLS[0] && sprite <= WALLS[1])
				return false;

			n.current = sprite;
			
			if (sprite > 71) //=== BOX || sprite === PLACED_BOX)
			{
				// Check if box can be moved
				nb = this.get_direction(direction, n.x, n.y);
				sprite = map[nb.y][nb.x];

				if (sprite <= PLACED_BOX)
					return false;

				n.action = 'push';
				n.next = nb;
			} else
				n.action = 'walk';
			
			return n;
		},

		setup: function()
		{
		var
			ss = this.spritesheet = j5g3.spritesheet(ASSETS.spritesheet_player)
				.grid(13,10)
		;
			this.direction = 'ne';
			
			this.states({
					idle_ne: [65],
					idle_se: [91],
					idle_sw: [78],
					idle_nw: [52],
					push_ne: [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
					push_nw: [52,53,54,55,56,57,58,59,60,61,62,63,64],
					push_se: [91,92,93,94,95,96,97,98,99,100, 101,102,103],
					push_sw: [78,79,80,81,82,83,84,85,86,87,88,89,90],
					walk_ne: [13, 14, 15, 16, 17, 18, 19],
					walk_nw: [0, 1, 2, 3, 4, 5, 6, 7],
					walk_se: [39, 40, 41, 42, 43, 44, 45],
					walk_sw: [26, 27, 28, 29, 30, 31, 32]
				})
				.go_state('idle_ne')
			;
		}

	}),

	Stats = j5g3.Clip.extend({

		fill: 'white',
		font: '12px Arial',

		setup: function()
		{
		var 
			me = this,
			time = this.time  = j5g3.text('Time: 0').pos(20, 80)
		;

			me.frames = [[
				me.level = j5g3.text('Level: ').pos(20, 20),
				me.moves = j5g3.text('Moves: 0').pos(20, 40),
				me.pushes= j5g3.text('Pushes: 0').pos(20, 60),
				time,
				j5g3.action(function() { 
					var t = Date.now() - me.start_time;
					time.text = ('Time: ' + Math.floor(t/1000));
				})
			]];

			this.reset();
		},

		reset: function()
		{
			this.start_time = new Date();
			this._push  = 0;
			this._moves = 0;
			this.addMoves(0);
			this.addPushes(0);
	//		this.setLevel(Sokoban.scene.currentLevel*1+1);
		},

		addMoves: function(n) { this.moves.text = ('Moves: ' + (this._moves += n)); },

		addPushes: function(n) { this.pushes.text = ('Pushes: ' + (this._push  += n)); },

		setLevel: function(n) { this.level.text = ('Level: ' + n); }

	}),
	
	Map = j5g3.Class.extend({
		
		raw: null,
		data: null,
		rows: 0,
		cols: 0,
		
		load_box: function(i)
		{
		var
			box = new Box({
				mapX: i % (this.cols-1),
				mapY: i / this.cols - 1 | 0,
				world: this.world
			}),
			
			s = this.walls.sprites.push(box)
		;
			this.floor.sprites[s] = this.floor.sprites[FREE];
			
			return s;
		},
		
		load_wall: function(i)
		{
		var
			map = this.raw,
			sprite = (map[i-1]==='#' ? 'l' : '') + 
				(map[i+1]==='#' ? 'r' : '') + 
				(map[i-this.cols-1]==='#' ? 't' : '') +
				(map[i+this.cols+1]==='#' ? 'b' : '')
		;
			if (sprite==='')
				sprite = 'desk';
				
			return SPRITES[sprite];
		},
		
		load_sprite: function(i)
		{
		var
			sprite = this.raw[i]
		;
			switch (sprite)
			{
			case '#': 
				sprite = this.load_wall(i);
				break;
			case '+':
			case '@':
				this.player.mapX = i % (this.cols-1);
				this.player.mapY = (i / this.cols - 1) | 0;
				sprite = PLAYER;
				break;
			case '$':
			case '*':
				sprite = this.load_box(i);
				break;
			case '!':
				//sprite = this.decorate(SPRITES[sprite], x, y);
				break;
			default: 
				sprite = SPRITES[sprite];
			}
			
			return sprite;
		},
		
		init: function(raw)
		{
		var
			i = 0,
			l = raw.length,
			row = [],
			data = this.data = [row]
		;
			this.raw = raw;
			this.cols = raw.indexOf("\n");
			this.rows = 0;
			
			for (; i<l; i++)
			{
				if (raw[i]==="\n")
				{
					data.push(row = []);
					this.rows++;
				} else
					row.push(this.load_sprite(i));
			}
			
			this.floor.map = this.walls.map = this.transform();
			
			l = this.floor.to_iso(row.length, data.length);
			
			this.floor.width = this.width = l.x;
			this.floor.height= this.height= l.y;
		},
		
		/** 
		 * Transform 2D Map to Isometric 
		 */
		transform: function()
		{
		var 
			map = this.data,
			x = map[0].length, y = map.length, 
			l = y, n,
			out = j5g3.ary(Math.ceil(y/2 + x/2), x+y, 71) 
		;
			while (y--)
				for (x=0; x < map[y].length; x++)
				{
					n = this.getXY(x, y, l);
					out[n.y][n.x] = map[y][x];
				}

			return out;
		},

		/** 
		 * Translates X and Y to Isometric 
		 */
		getXY: function(x, y, maxy)
		{
			maxy = maxy || this.data.length;
		var
			ny = x+y,
			nx = Math.floor((maxy-y)/2) + Math.round(x/2)
		;
			if ((y&1) && !(ny&1)) 
				nx--;

			return { x: nx, y: ny };
		},
		
		set: function(x, y, val)
		{
			
		},
		
		get: function(x, y)
		{
			return this.data[y][x];
		}
		
	}),

	World = j5g3.Clip.extend({
		
		player: null,
		data: null, 
		
		walls: null,
		floor: null,
		
		get_box: function(x, y)
		{
			return this.walls.sprites[this.walls.map[y][x]];
		},
		
		update_frame: function()
		{
			this.player.update();	
		},
		
		get_map: function(ss, fill)
		{
			return j5g3.map({
				sprites: ss || j5g3.ary(80, 0, game.spritesheet.sprite(fill || EMPTY)),
				tw: TW, th: TH,
				offsetY: TO,
				paint: j5g3.Paint.Isometric
			});
		},
		
		load: function(l)
		{
			this.data = new Map(l);
		},
		
		setup: function()
		{
		var
			me = this,
			ss = game.spritesheet,
			floor = me.floor = me.get_map(null, FREE),
			walls = me.walls = me.get_map(ss.sprites())
		;
			me.boxes = j5g3.clip();
			me.player = new Player();
			me.player.world = this;
			
			me.add([
				floor,
				walls
			]);
			
			walls.sprites[FREE] = walls.sprites[TARGET] = 
			floor.sprites[EMPTY] = walls.sprites[EMPTY] = null;
			
			floor.sprites[TARGET] = ss.sprite(TARGET);
			
			walls.sprites[PLAYER] = me.player;
		},

		/** Adds decoration sprite to both layers! */
		decorate: function(sprite, x, y)
		{
		var
			pos = this.map.getXY(x, y),
			sprites = j5g3.gdk.assets.spritesheet.sprites
		;
			pos = this.walls.getIsometricCoords(pos.x, pos.y);
			this.decoration0.add(j5g3.clip([[sprites[sprite]]]).pos(pos.x, pos.y));
			this.decoration1.add(j5g3.clip([[sprites[sprite+8]]]).pos(pos.x, pos.y));

			return ' ';
		}

	}),
	
	game
;

	loader.ready(function() {
		game = new Sokoban();
		game.scene(Splash);
	});

});
