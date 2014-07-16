/**
 * Sokoban
 */

(function(window) {
'use strict';

var
	CocoonJS = window.CocoonJS,
	j5g3 = window.j5g3,

	loader = j5g3.loader(),

	////////////////////////////////////////
	//
	// Game Engine
	//
	///////////////////////////////////////
	Sokoban = window.Sokoban = j5g3.Engine.extend({

		stage_settings: {
			width: 1280, height: 720,
			container: true
		},

		mice: null,
		background: null,

		scene: function(Scene, options)
		{
		var
			opts = {
				width: game.stage.width,
				height: game.stage.height
			}
		;
			j5g3.extend(opts, options);

			if (this.mice)
				this.mice.destroy();

			this.mice = j5g3.in(this.stage.canvas);
			this.stage.add(new Scene(opts));
		},

		startFn: function()
		{
			this.stageManager = new j5g3.gdk.StageManager(this.stage);
			Sokoban.spritesheet = j5g3.spritesheet(Sokoban.ASSETS.spritesheet_world)
				.grid(8, 10);

			this.background = this.stage.layer({ background: true });

			this.run();
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
			game.scene(Menu);
		},

		setup: function()
		{
			game.mice.on_fire = this.remove.bind(this);
			game.mice.module.Mouse.capture_move = false;

			this.add(j5g3.image(Sokoban.ASSETS.splash)
				.stretch(game.stage.width, game.stage.height)
			);
		}

	}),

	MenuItem = j5g3.Clip.extend({

		width: 100,
		height: 100,
		id: null,

		at: j5g3.HitTest.Rect,

		on_click: function()
		{
			game.scene(Level, { currentLevel: this.id });
		},

		hover: function(sel)
		{
			this.go(sel===false ? 0 : 1);
		},

		setup: function()
		{
		var
			a = Sokoban.ASSETS,
			normal = j5g3.image(a['b'+this.id]).size(this.width, this.height),
			hover = j5g3.image(a['r' + this.id]).size(this.width, this.height)
		;
			normal.paint = hover.paint = j5g3.Paint.ImageScaled;

			this.add(normal)
				.add_frame(hover)
				.go(0).stop();
		}

	}),

	Menu = j5g3.gdk.Scene.extend({

		alpha: 0,
		transition_in: j5g3.fx.Animate.fade_in,

		on_mouse: function()
		{
		var
			s = this.at(game.mice.x, game.mice.y)
		;
			if (this.s !== s)
			{
				if (this.s)
					this.s.hover(false);

				if (s)
				{
					this.s = s;
					s.hover();
				}
			}

			return s;
		},

		on_click: function()
		{
			var s = this.on_mouse();

			if (s)
			{
				s.on_click();
				this.background.remove();
				this.remove();
			}
		},

		setup: function()
		{
		var
			levels = Sokoban.ASSETS.levels.json,
			l, i, y = 40, x =40
		;
			game.mice.on({
				move: this.on_mouse.bind(this),
				buttonY: this.on_click.bind(this)
			});

			game.mice.module.Mouse.capture_move = true;

			this.background = j5g3.image(Sokoban.ASSETS.background);
			game.background.add(this.background);
			game.background.invalidate();

			for (i=0; i<levels.length; i++)
			{
				l = levels[i];

				this.add(new MenuItem({
					x: x, y: y, id: i
				}));

				if (x>game.stage.width-200)
				{
					x=40; y+=150;
				} else
					x+=150;
			}
		}

	}),

	Level = j5g3.gdk.Scene.extend({

		currentLevel: 0,
		alpha: 0,

		transition_in: j5g3.fx.Animate.fade_in,
		transition_out: j5g3.fx.Animate.fade_out,

		history: null,
		world: null,

		restart: function(level)
		{
			if (level)
				this.currentLevel = level;

			this.history = [];
			this.world.load(Sokoban.ASSETS.levels.json[this.currentLevel]);
			this.center(this.world.player.mapX, this.world.player.mapY, true);
		},

		on_move: function(ev)
		{
		var
			dir = ({
				up_left: 'nw',
				up_right: 'ne',
				down_left: 'sw',
				down_right: 'se'
			}[ev.direction]),

			player = this.world.player,

			move = dir ? player.move(dir, this.center.bind(this)) : false
		;
			if (move)
				this.history.push(move);
		},

		on_btn: function(ev)
		{

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

		on_click: function()
		{
		var
			s = this.at(game.mice.x, game.mice.y)
		;
			if ((s instanceof MenuItem) && s.on_click)
				s.on_click();
		},

		reset: function()
		{
			this.restart();
		},

		back: function()
		{
		var
			action = this.history.pop(),
			player = this.world.player
		;
			if (!action)
				return;

			player.move_to(action.ix, action.iy);
			player.direction = action.old_direction;
			player.idle();

			if (action.current)
				action.current.move_to(action.boxpos.ix, action.boxpos.iy);
		},

		quit: function()
		{
			this.remove();
			game.scene(Menu);
		},

		setup: function()
		{
		var
			me = this,
			background = j5g3.image(Sokoban.ASSETS.background),
			menu = me.menu = j5g3.clip({ y: 10 }),
			controls = me.controls = j5g3.clip({ x: 10, y: 500, alpha: 0.7 })
		;
			menu.add([
				new MenuItem({
					y: 10, x: 10, id: "reset", width: 80, height: 80,
					on_click: this.reset.bind(this)
				}),
				new MenuItem({
					y: 10, x: 100, id: "undo", width: 80, height: 80,
					on_click: this.back.bind(this)
				}),
				new MenuItem({
					y: 10, x: 1180, id: 'back', width: 80, height: 80,
					on_click: this.quit.bind(this)
				}),
			]);

			controls.add([
				new MenuItem({
					x: 1150, id: "NE",
					on_click: this.on_btn.bind(this)
				}),
				new MenuItem({
					id: "NW",
					on_click: this.on_btn.bind(this)
				}),
				new MenuItem({
					y: 100, id: 'SW',
					on_click: this.on_btn.bind(this)
				}),
				new MenuItem({
					y: 100, x: 1150, id: 'SE',
					on_click: this.on_btn.bind(this)
				})
			]);

			me.add([
				me.world = new Sokoban.World(),
				menu, controls
			]);

			game.background.add(background);
			game.background.invalidate();

			game.mice.on({
				move: this.on_move.bind(this),
				buttonY: this.on_click.bind(this)
			});

			game.mice.module.Mouse.capture_move = false;

			setTimeout(function() { me.restart(); }, 0);
		}

	}),

	////////////////////////////
	//
	// ENTITIES
	//
	////////////////////////////
	Stats = j5g3.Clip.extend({

		fill: 'white',
		font: '12px Arial',

		setup: function()
		{
		var
			me = this,
			time = this.time  = j5g3.text('Time: 0').pos(20, 80)
		;

			me.add([
				me.level = j5g3.text('Level: ').pos(20, 20),
				me.moves = j5g3.text('Moves: 0').pos(20, 40),
				me.pushes= j5g3.text('Pushes: 0').pos(20, 60),
				time
			]);

			this.reset();
		},

		reset: function()
		{
			this.start_time = Date.now();
			this._push  = 0;
			this._moves = 0;
			this.addMoves(0);
			this.addPushes(0);
		},

		addMoves: function(n) { this.moves.text = ('Moves: ' + (this._moves += n)); },

		addPushes: function(n) { this.pushes.text = ('Pushes: ' + (this._push  += n)); },

		setLevel: function(n) { this.level.text = ('Level: ' + n); }

	}),

	game, i
;
	Sokoban.ASSETS = {
		spritesheet_world: loader.img('spritesheet.png'),
		spritesheet_player: loader.img('spritesheet-player.png'),
		splash: loader.img('splash.png'),
		background: loader.img('background.jpg'),
		floor: loader.img('floor.svg'),

		rundo: loader.img('rundo.png'),
		rback: loader.img('rback.png'),
		rreset: loader.img('rreset.png'),
		bundo: loader.img('bundo.png'),
		bback: loader.img('bback.png'),
		breset: loader.img('breset.png'),

		levels: loader.json("levels.json")
	};

	([ 'NW', 'NE', 'SW', 'SE', 0,1,2,3,4,5,6,7,8,9])
	.forEach(function(i)
	{
		Sokoban.ASSETS['b' + i] = loader.img('b'+i+'.svg');
		Sokoban.ASSETS['r' + i] = loader.img('r'+i+'.svg');
	});

	loader.ready(function() {
		game = window.game = new Sokoban();
		game.scene(Splash);
	});

})(this);