/**
 * Sokoban
 */

(function(window) {
'use strict';

var
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

		dialog: function(title, message, on_yes)
		{
			var d = this._dialog || (this._dialog = new Dialog());

			if (d.parent)
				return;

			this.stage.add(d.show(title, message, on_yes));
		},

		startFn: function()
		{
			this.stageManager = new j5g3.gdk.StageManager(this.stage);
			this.background = this.layer({ background: true });
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
		fill: '#eee',

		transition_in: j5g3.fx.Animate.fade_in,
		transition_out: j5g3.fx.Animate.fade_out,

		on_remove: function()
		{
			game.mice.on_fire = null;
			game.scene(Menu);
		},

		setup: function()
		{
			Sokoban.spritesheet = j5g3.spritesheet(Sokoban.ASSETS.spritesheet_world)
				.grid(8, 10);

			game.mice.on_fire = this.remove.bind(this);
			game.mice.module.Mouse.capture_move = false;

			this.background = j5g3.image(Sokoban.ASSETS.background);
			this.background.alpha = 0.5;

			this.add([
				this.background,
				j5g3.sftext({ x: 40, y: 380, font: '120px "Audiowide"',
					text: 'Underground' }),
				j5g3.sftext({ x: 40, y: 580, font: '40px "Audiowide"',
					text: 'Press any key to continue.'
				})
			]);
		}

	}),

	Menu = j5g3.gdk.Scene.extend({

		alpha: 0,
		transition_in: j5g3.fx.Animate.fade_in,
		fill: '#eee',

		setupButton: function(level, i)
		{
		var
			me = this,
			bg = Sokoban.spritesheet.sprite(17).scale(0.8),
			bgh= Sokoban.spritesheet.sprite(18).scale(0.8),
			label = j5g3.text({ text: '0'+i, x: 50, y: 30, font: '30px Audiowide'}).align_text('center'),
			labelh = j5g3.text({ text: '0'+i, x: 50, y: 30, font: '30px Audiowide'}).align_text('center')
		;
			this.buttons.add(new j5g3.gdk.Button({
				width: 100, height: 100,
				value: i,
				states: {
					normal: [ bg, label ],
					hover: [ bgh, labelh ]
				},
				on_click: function()
				{
					me.remove();
					game.scene(Level, { currentLevel: this.value });
				}
			}));
		},

		setupButtons: function()
		{
			var levels = Sokoban.ASSETS.levels.json;

			this.buttons = new j5g3.gdk.ButtonGroup({
				x: 140, y: 200, width: 1100, height: 600,
				input: game.mice,
				arrange: true, grid_x: 150, grid_y: 130
			});

			levels.forEach(this.setupButton.bind(this));

			this.add(this.buttons);
		},

		setupBackground: function()
		{
			game.background.add(j5g3.image(Sokoban.ASSETS.background));
			game.background.invalidate();
		},

		setup: function()
		{
		var
			text = j5g3.sftext({
				x: 320, y: 60, text: 'Select Destination', font: "60px 'Audiowide'"
			})
		;
			this.setupButtons();
			this.setupBackground();

			this.add(text);
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

		check_win: function()
		{
			var won = true;

			this.world.boxes.forEach(function(box) {
				if (!box.placed)
					won = false;
			});

			if (won)
				game.dialog("SUCCESS", "Go back to main menu?", this.doQuit.bind(this));
		},

		on_move: function(ev)
		{
		var
			dir = ({
				'up_left': 'nw',
				'up_right': 'ne',
				'down_left': 'sw',
				'down_right': 'se'
			}[ev.direction]),

			player = this.world.player,

			move = dir ? player.move(dir, this.center.bind(this), this.check_win.bind(this)) : false
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
					on_remove: this.check_win.bind(this),
					auto_remove: true,
					duration: 10,
					to: {
						x: nx,
						y: ny
					}
				}));
		},

		'reset': function()
		{
			game.dialog('Reset', 'Restart to original position?', this.restart.bind(this));
		},

		'undo': function()
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

		doQuit: function()
		{
			this.remove();
			game.scene(Menu);
		},

		'quit': function()
		{
			game.dialog('Quit', 'Are you sure you want to quit?', this.doQuit.bind(this));
		},

		setupButton: function(img)
		{
			return new j5g3.gdk.Button({
				width: 80, height: 80,
				states: {
					normal: j5g3.image(Sokoban.ASSETS['b'+ img ]),
					hover: j5g3.image(Sokoban.ASSETS['r' + img ])
				},
				on_click: this[img].bind(this)
			});
		},

		setupMenu: function()
		{
		var
			menu = new j5g3.gdk.ButtonGroup({ input: game.mice })
		;
			menu.add([
				this.setupButton('reset').pos(30, 10),
				this.setupButton('undo').pos(130, 10),
				this.setupButton('quit').pos(1160, 10)
			]);

			return menu;
		},

		setup: function()
		{
		var
			me = this,
			menu = this.setupMenu(),
			bayN = j5g3.sftext({ y: 0, x: 480, fill: '#eee', text: '0' + this.currentLevel, font: "80px 'Audiowide', sans-serif" }),
			bay = j5g3.sftext({ y: 40, x: 640, fill: '#eee', text: 'bay', font: "40px 'Audiowide', sans-serif" })
		;

			me.add([
				me.world = new Sokoban.World(),
				menu, bayN, bay
			]);

			game.background.invalidate();
			game.mice.on({'move': this.on_move.bind(this)});

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

	Dialog = j5g3.gdk.Scene.extend({

		x: 340,	y: 326,
		width: 600, height: 394,

		transition_in: j5g3.fx.Animate.slide_up,
		transition_out: j5g3.fx.Animate.slide_down,
		fill: '#eee',

		show: function(title, message, on_yes, on_no)
		{
			var d = this;

			d.title.text = title;
			d.title.align_text('center');
			d.message.text = message;
			d.message.align_text('center');

			d.yes.on_click = function() { d.remove(on_yes); };
			d.no.on_click = function() { d.remove(on_no); };

			this.btnGroup.disable();
			this.btnGroup.input = game.mice;
			this.btnGroup.enable();

			if (!this.tween.parent)
			{
				this.y = 326;
				this.enter();
			}
			this.tween.duration = 15;

			return this;
		},

		remove: function(on_remove)
		{
			this.on_remove = on_remove;
			this.btnGroup.disable();
			j5g3.gdk.Scene.prototype.remove.call(this);
			this.tween.duration = 15;
		},

		setupButtons: function()
		{
			this.btnGroup = new j5g3.gdk.ButtonGroup({
				transform: this.M.to_m(this.x, 326),
				block: true
			});
			this.yes = new j5g3.gdk.Button({
				x: 150, y: 230, width: 80, height: 80,
				states: { normal: Sokoban.ASSETS.byes }
			});
			this.no = new j5g3.gdk.Button({
				x: 370, y: 230, width: 80, height: 80,
				states: { normal: Sokoban.ASSETS.bno }
			});

			this.btnGroup.add([ this.yes, this.no ]);
		},

		setup: function()
		{
			this.title = j5g3.sftext({ alpha: 0.8, x: 300, y: 40, font: '70px Audiowide' });
			this.message = j5g3.sftext({ alpha: 0.8, x: 300, y: 140, font: '26px Audiowide' });

			this.setupButtons();

			this.add([ Sokoban.ASSETS.dialog, this.title, this.message, this.btnGroup ]);
		}

	}),

	game, i,

	loading = new j5g3.gdk.Loading({
		loader: loader,

		on_remove: function()
		{
			game.scene(Splash);
		}
	})
;
	Sokoban.ASSETS = {
		spritesheet_world: loader.img('spritesheet.png'),
		spritesheet_player: loader.img('spritesheet-player.png'),
		splash: loader.img('splash.png'),
		background: loader.img('background.jpg'),

		'rundo': loader.img('rundo.png'),
		'rquit': loader.img('rback.png'),
		'rreset': loader.img('rreset.png'),
		'bundo': loader.img('bundo.png'),
		'bquit': loader.img('bback.png'),
		'breset': loader.img('breset.png'),
		byes: loader.img('byes.png'),
		bno: loader.img('bno.png'),

		dialog: loader.img('dialog.png'),

		levels: loader.json("levels.json")
	};

	game = window.game = new Sokoban();
	game.stage.add(loading);

})(this);