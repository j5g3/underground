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

		scene: function(Scene)
		{
			this.stage.add(new Scene());
		},

		startFn: function()
		{
			this.mice = window.mice(this.stage.canvas);

			Sokoban.spritesheet = j5g3.spritesheet(this.ASSETS.spritesheet_world)
				.grid(8, 10);

			this.background = new j5g3.Stage({
				width: this.stage.width,
				height: this.stage.height,
				canvas: j5g3.id('background'),
				draw: j5g3.Draw.RootDirty
			});

			this.stage.add(this.background);

			this.fps(32).run();
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

	Menu = j5g3.gdk.Scene.extend({

		alpha: 0,

		transition_in: j5g3.fx.Animate.fade_in,

		setup: function()
		{
		var
			app = CocoonJS.App
		;
			app.onLoadInTheWebViewSucceed.addEventListener(function(url) { app.showTheWebView(); });
			CocoonJS.App.loadInTheWebView('menu.html');
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

			this.world.load(Sokoban.ASSETS.levels[this.currentLevel]);
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
			background = j5g3.image(Sokoban.ASSETS.background)
		;
			me.add([
				me.world = new Sokoban.World(),
			]);

			game.background.add(background);
			game.background.invalidate();
			game.mice.move = this.on_move.bind(this);

			me.restart();
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
