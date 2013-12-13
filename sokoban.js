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
			width: 1280, height: 720
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

			this.mice = window.mice(this.stage.canvas);
			this.stage.add(new Scene(opts));
		},

		startFn: function()
		{
			Sokoban.spritesheet = j5g3.spritesheet(Sokoban.ASSETS.spritesheet_world)
				.grid(8, 10);

			this.background = new j5g3.Stage({
				width: this.stage.width,
				height: this.stage.height,
				canvas: j5g3.id('background'),
				draw: j5g3.Draw.RootDirty
			});

			this.stage.add(this.background);

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
			game.mice.module.mouse.capture_move = false;

			this.add(j5g3.image(Sokoban.ASSETS.splash)
				.stretch(game.stage.width, game.stage.height)
			);
		}

	}),

	MenuItem = j5g3.Clip.extend({

		width: 75,
		height: 75,
		id: null,
		font: '30px sans-serif',
		fill: '#eee',

		at: j5g3.HitTest.Rect,

		on_click: function()
		{
			game.scene(Level, { currentLevel: this.id });
		},

		setup: function()
		{
			this.labelText = j5g3.text({ y: 30, text: this.label });
			this.add(this.labelText);
		}

	}),

	Menu = j5g3.gdk.Scene.extend({

		alpha: 0,

		transition_in: j5g3.fx.Animate.fade_in,

		font: '30px sans-serif',
		fill: '#eee',

		on_mouse: function()
		{
		var
			s = this.at(game.mice.x, game.mice.y)
		;
			if (this.s !== s)
			{
				if (this.s)
					this.s.fill = null;

				if (s)
				{
					this.s = s;
					s.fill = '#e00';
				}
			}
		},

		on_click: function()
		{
			this.on_mouse();

			if (this.s)
			{
				this.s.on_click();
				this.background.remove();
				this.remove();
			}
		},

		setup: function()
		{
		var
			levels = Sokoban.ASSETS.levels.json,
			l, i, y = 0, x =0
		;
			game.mice.move = this.on_mouse.bind(this);
			game.mice.buttonY = this.on_click.bind(this);
			game.mice.module.mouse.capture_move = true;

			this.background = j5g3.image(Sokoban.ASSETS.background);
			game.background.add(this.background);
			game.background.invalidate();

			for (i=0; i<levels.length; i++)
			{
				l = levels[i];

				this.add(new MenuItem({
					x: x, y: y,
					id: i,
					label: i
				}));

				if (x>800)
				{
					x=0; y+=90;
				} else
					x+=90;
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

		show_menu: function()
		{
			if (this.menu.anim)
				return;

			this.menu.anim = true;

			if (this.menu.parent)
				return this.hide_menu();

			this.add(this.menu);
			game.stage.add(j5g3.tween({
				target: this.menu,
				to: { y: 0 },
				duration: 15,
				auto_remove: true,
				on_remove: function()
				{
					this.target.anim=false;
				}
			}));
			game.stage.add(j5g3.tween({
				target: this.menu_button,
				to: { y: 50 },
				duration: 15,
				auto_remove: true
			}));
		},

		hide_menu: function()
		{
			game.stage.add(j5g3.tween({
				target: this.menu,
				to: { y: -40 },
				duration: 15,
				auto_remove: true,
				on_remove: function()
				{
					this.target.remove();
					this.target.anim = false;
				}
			}));
			game.stage.add(j5g3.tween({
				target: this.menu_button,
				to: { y: 10 },
				duration: 15,
				auto_remove: true
			}));

		},

		setup: function()
		{
		var
			me = this,
			background = j5g3.image(Sokoban.ASSETS.background),
			menu = me.menu = j5g3.clip({ y: -40 }),
			menu_button = me.menu_button = new MenuItem({
				y: 10, x: 1280/2,
				label: "MENU",
				on_click: me.show_menu.bind(this)
			})
		;
			menu.add([
				me.reset = new MenuItem({
					y: 10, x: 10, label: "Reset",
					on_click: this.reset.bind(this)
				}),
				me.back  = new MenuItem({
					y: 10, x: 100, label: "Back",
					on_click: this.back.bind(this)
				}),
				me.quit = new MenuItem({
					y: 10, x: 1180, label: 'Quit',
					on_click: this.quit.bind(this)
				})
			]);

			me.add([
				me.world = new Sokoban.World(),
				menu_button
			]);

			game.background.add(background);
			game.background.invalidate();

			game.mice.move = this.on_move.bind(this);
			game.mice.module.mouse.capture_move = false;
			game.mice.buttonY = this.on_click.bind(this);

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

	game
;
	Sokoban.ASSETS = {
		spritesheet_world: loader.img('spritesheet.png'),
		spritesheet_player: loader.img('spritesheet-player.png'),
		splash: loader.img('splash.png'),
		background: loader.img('background.jpg'),
		levels: loader.json("levels.json")
	};

	loader.ready(function() {
		game = window.game = new Sokoban();
		game.scene(Splash);
	});

})(this);