/**
 * Sokoban
 */

j5g3.ready(function() {
'use strict';

var
	j5g3 = window.j5g3,
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
			this.mice = window.mice(this.stage.canvas);
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
			this.go(0);
		},

		after_push: function()
		{
		var
			me = this,
			walls = me.world.walls,
			position = me.nextPos
		;
			walls.set_tile(me.mapX, me.mapY, undefined);
			walls.set_tile(position.x, position.y, me.sprite);

			me.mapX = position.x;
			me.mapY = position.y;
			me.pos(0,0);

			me.go(me.world.is_target(me.mapX, me.mapY) ? 1 : 0);
		},

		push: function(position)
		{
		var
			me = this
		;
			me.nextPos = position;
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

		on_remove: function()
		{
			game.mice.on_fire = null;
			game.scene(Level);
		},

		setup: function()
		{
			game.mice.on_fire = this.remove.bind(this);

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
			this.center(this.world.player.mapX, this.world.player.mapY, true);
		},

		on_move: function(ev)
		{
			this.world.player.move({
				up_left: 'nw',
				up_right: 'ne',
				down_left: 'sw',
				down_right: 'se'
			}[ev.direction],
				this.center.bind(this)
			);
		},

		center: function(mapX, mapY, no_tween)
		{
		var
			world = this.world,
			x = world.walls.transform_x(mapX, mapY),
			y = world.walls.transform_y(mapX, mapY),
			pos = world.walls.to_iso(x, y),
			nx = (game.stage.width - world.width)/2-(pos.x/25) |0,
			ny = (game.stage.height - world.height)/2-(pos.y/25) |0
		;
			if (no_tween)
				world.pos(nx, ny);
			else
				this.add(j5g3.tween({
					target: this.world,
					auto_remove: true,
					duration: 10,
					to: {
						x: nx,
						y: ny
					}
				}));
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

		cx: 20,
		cy: 70,

		world: null,
		mapX: null,
		mapY: null,
		under: null,

		move_to: function(x, y)
		{
			this.world.walls.set_tile(this.mapX, this.mapY, undefined);
			this.world.walls.set_tile(x, y, PLAYER);
			this.mapX = x;
			this.mapY = y;
		},

		on_tween_remove: function()
		{
			this.move_to(this.nextPos.x, this.nextPos.y);

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
				this.on_tween_remove
			);
		},

		push: function(pos)
		{
			this.animateTo(this.x + pos.mx/2, this.y + pos.my/2, 'walk_' + this.direction, 5, function() {
				this.animateTo(this.x, this.y, 'push_' + this.direction, 5, function() {

					pos.current.push(pos.boxpos);

					this.animateTo(this.x, this.y, 'push_' + this.direction, 5, function()
					{
						this.animateTo(this.x + pos.mx/2, this.y + pos.my/2, 'walk_' + this.direction, 5, this.on_tween_remove);
					});
				});
			});

		},

		move: function(direction, fn)
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
				if (fn)
					fn(pos.x, pos.y);

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
			map = this.world,
			n = this.get_direction(direction),
			sprite,
			next
		;
			if (map.is_wall(n.x, n.y))
				return false;

			if ((sprite = map.is_box(n.x, n.y)))
			{
				n.current = sprite;
				n.boxpos = this.get_direction(direction, n.x, n.y);

				if (map.is_free(n.boxpos.x, n.boxpos.y))
					n.action = 'push';
				else
					return false;
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
		rows: 0,
		cols: 0,

		get_pos: function(i)
		{
		var
			result = {
				x: i % (this.cols+1),
				y: i / (this.cols+1) | 0
			}
		;
			return result;
		},

		each: function(fn)
		{
		var
			i = 0,
			raw = this.raw,
			l = raw.length,
			pos
		;
			for (; i<l; i++)
			{
				if (raw[i]!=="\n")
				{
					pos = this.get_pos(i);
					fn(raw[i], pos.x, pos.y, i);
				}
			}
		},

		init: function(raw)
		{
			this.raw = raw;
			this.cols = raw.indexOf("\n");
			this.rows = raw.split("\n").length;
		}

	}),

	World = j5g3.Clip.extend({

		player: null,
		data: null,

		walls: null,
		floor: null,

		is_wall: function(x, y)
		{
		var
			tile = this.walls.get_tile(x, y)
		;
			return tile > WALLS[0] && tile < WALLS[1];
		},

		is_box: function(x, y)
		{
		var
			tile = this.walls.get_tile(x, y)
		;
			return (tile >= this.box_start) && this.walls.sprites[tile];
		},

		is_free: function(x, y)
		{
		var
			tile = this.walls.get_tile(x, y)
		;
			return !tile;
		},

		is_target: function(x, y)
		{
			return this.floor.get_tile(x, y)===TARGET;
		},

		set_player: function(x, y, tile)
		{
		var
			player = this.player
		;
			player.mapX = x;
			player.mapY = y;

			this.walls.map2d[y][x] = PLAYER;
			this.floor.map2d[y][x] = tile;
		},

		load_sprite: function(sprite, x, y, i)
		{
			switch (sprite)
			{
			case '#': return this.load_wall(x, y, i);
			case '+': return this.set_player(x, y, TARGET);
			case '@': return this.set_player(x, y, FREE);
			case '$': return this.load_box(x, y, FREE);
			case '*': return this.load_box(x, y, TARGET);
			case '.':
				this.floor.map2d[y][x] = TARGET;
				break;
			case '!':
				//sprite = this.decorate(SPRITES[sprite], x, y);
				break;
			default:
				this.floor.map2d[y][x] = FREE;
			}
		},

		load_box: function(x, y, sprite)
		{
		var
			box = new Box({
				mapX: x,
				mapY: y,
				world: this
			})
		;
			box.sprite = this.walls.sprites.push(box)-1;

			if (!this.box_start)
				this.box_start = box.sprite;

			this.walls.map2d[y][x] = box.sprite;
			this.floor.map2d[y][x] = sprite;
		},

		load_wall: function(x, y, i)
		{
		var
			map = this.map.raw,
			sprite = (map[i-1]==='#' ? 'l' : '') +
				(map[i+1]==='#' ? 'r' : '') +
				(map[i-this.map.cols-1]==='#' ? 't' : '') +
				(map[i+this.map.cols+1]==='#' ? 'b' : '')
		;
			if (sprite==='')
				sprite = 'desk';

			this.walls.map2d[y][x] = SPRITES[sprite];
			this.floor.map2d[y][x] = FREE;
		},

		update_frame: function()
		{
			// Make sure player is animated.
			this.player.update();
		},

		load: function(raw)
		{
		var
			map = this.map = new Map(raw),
			size
		;
			this.walls.map2d = j5g3.ary(map.cols, map.rows);
			this.floor.map2d = j5g3.ary(map.cols, map.rows);

			map.each(this.load_sprite.bind(this));

			this.walls.transform();
			this.floor.transform();

			size = this.walls.to_iso(this.walls.map[0].length, this.walls.map.length);

			this.size(size.x, size.y);

			this.floor.size(size.x, size.y);
			this.floor.cache();
		},

		setup_floor: function()
		{
		var
			free = game.spritesheet.sprite(FREE),
			floor = this.floor = new j5g3.gdk.IsometricMap({
				tw: TW, th: TH,
				offsetY: TO,
				sprites: {}
			})
		;
			floor.sprites[TARGET] = game.spritesheet.sprite(TARGET);
			floor.sprites[FREE] = game.spritesheet.sprite(FREE);
		},

		setup_walls: function()
		{
		var
			walls = this.walls = new j5g3.gdk.IsometricMap({
				tw: TW, th: TH,
				offsetY: TO,
				sprites: game.spritesheet.sprites()
			})
		;
			walls.sprites[PLAYER] = this.player;

			walls.sprites[FREE] = walls.sprites[TARGET] =
			walls.sprites[EMPTY] = null;
		},

		setup: function()
		{
		var
			me = this
		;
			me.player = new Player({ world: this });
			me.setup_walls();
			me.setup_floor();

			me.add([ me.floor, me.walls ]);
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
