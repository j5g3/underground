
(function(window) {
"use strict";
var
	j5g3 = window.j5g3,
	Sokoban = window.Sokoban,

	// Tile Height, Width and Offset
	TH = 192,
	TW = 128,
	TO = -48,

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
	}
;

Sokoban.Box = j5g3.gdk.Element.extend({

	mapX: null,
	mapY: null,
	world: null,
	sprite: null,

	setup: function()
	{
		var placed = j5g3.clip()
			.add(Sokoban.spritesheet.sprite(PLACED_BOX))
			.add_frame(Sokoban.spritesheet.sprite(PLACED_BOX+1))
			.add_frame(Sokoban.spritesheet.sprite(PLACED_BOX+2))
			.add_frame(Sokoban.spritesheet.sprite(PLACED_BOX+1))
			.go(0)
		;
		placed.st = 0.1;

		this.add(Sokoban.spritesheet.sprite(BOX));
		this.add_frame(placed);
		this.check_target();
	},

	check_target: function()
	{
		this.go(this.placed = this.world.is_target(this.mapX, this.mapY) ? 1 : 0);
	},

	move_to: function(x, y)
	{
	var
		me = this,
		walls = me.world.walls
	;
		walls.set_tile(me.mapX, me.mapY, undefined);
		walls.set_tile(x, y, me.sprite);

		me.mapX = x;
		me.mapY = y;
		me.pos(0,0);
		me.check_target();
	},

	after_push: function()
	{
		this.move_to(this.nextPos.x, this.nextPos.y);
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

});

Sokoban.Player = j5g3.gdk.Element.extend({

	cx: 20,
	cy: 70,

	world: null,
	mapX: null,
	mapY: null,

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

	push: function(pos, on_done)
	{
		this.animateTo(this.x + pos.mx/2, this.y + pos.my/2, 'walk_' + this.direction, 5, function() {
			this.animateTo(this.x, this.y, 'push_' + this.direction, 5, function() {

				pos.current.push(pos.boxpos);

				this.animateTo(this.x, this.y, 'push_' + this.direction, 5, function()
				{
					this.animateTo(this.x + pos.mx/2, this.y + pos.my/2, 'walk_' + this.direction, 5, function() {
						this.on_tween_remove();
						on_done && on_done();
					});
				});
			});
		});

	},

	move: function(direction, fn, on_push)
	{
		if (this.moving)
			return;

	var
		pos = this.check_direction(direction)
	;
		pos.old_direction = this.direction;
		this.direction = direction;

		if (pos)
		{
			this.nextPos = pos;
			pos.ix = this.mapX; pos.iy = this.mapY;

			this[pos.action](pos, on_push);

			if (fn)
				fn(pos.x, pos.y);

			return pos;
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
			ix: x, iy: y,
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
		ss = this.spritesheet = j5g3.spritesheet(Sokoban.ASSETS.spritesheet_player)
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

});

Sokoban.Map = j5g3.Class.extend({

	data: null,
	rows: null,
	cols: null,

	init: function(raw)
	{
		j5g3.Class.apply(this, [ raw ]);

		this.normalize();
	},

	/**
	 * This function is so ugly. It makes sure map data is always the
	 * same width.
	 */
	normalize: function()
	{
	var
		map = this.data.split("\n"),
		i = map.length,
		cols = 0
	;
		if (this.rows===null)
			this.rows = i;

		while (i--)
			if (map[i].length > cols)
				cols = map[i].length;

		this.cols = cols;

		for (i=0; i<this.rows; i++)
			if (map[i].length < cols)
				map[i] = map[i] + (new Array(cols-map[i].length+1)).join(" ");

		this.data = map.join("\n");
	},

	each: function(fn)
	{
	var
		i = 0,
		raw = this.data,
		l = raw.length,
		y = 0, x = 0,
		pos
	;
		for (; i<l; i++)
		{
			if (raw[i]==="\n")
			{
				y++; x=0;
			}else
				fn(raw[i], x++, y, i);
		}
	}

});

Sokoban.World = j5g3.Clip.extend({

	player: null,
	data: null,

	walls: null,
	floor: null,
	boxes: null,

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
		box
	;
		this.floor.map2d[y][x] = sprite;

		box = new Sokoban.Box({
			mapX: x,
			mapY: y,
			world: this
		});

		box.sprite = this.walls.sprites.push(box)-1;

		this.boxes.push(box);

		if (!this.box_start)
			this.box_start = box.sprite;

		this.walls.map2d[y][x] = box.sprite;
	},

	load_wall: function(x, y, i)
	{
	var
		map = this.map.data,
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
		// Make sure player is animated since map doesnt update sprites.
		if (this.boxes)
		{
			this.player.update();
			this.boxes.forEach(function(box) {
				box.update();
			});
		}
	},

	load: function(raw)
	{
	var
		map = this.map = new Sokoban.Map(raw),
		size
	;
		this.boxes = [];
		this.walls.map2d = j5g3.ary(map.cols, map.rows);
		this.floor.map2d = j5g3.ary(map.cols, map.rows);

		map.each(this.load_sprite.bind(this));

		this.walls.transform();
		this.floor.transform();

		this.size(this.floor.width, this.floor.height);
		this.floor.cache();

		//this.invalidate();
	},

	setup_floor: function()
	{
	var
		free = Sokoban.spritesheet.sprite(FREE),
		floor = this.floor = new j5g3.gdk.IsometricMap({
			tw: TW, th: TH,
			offsetY: TO,
			sprites: {}
		})
	;
		floor.sprites[TARGET] = Sokoban.spritesheet.sprite(TARGET);
		floor.sprites[FREE] = Sokoban.spritesheet.sprite(FREE);
	},

	setup_walls: function()
	{
	var
		walls = this.walls = new j5g3.gdk.IsometricMap({
			tw: TW, th: TH,
			offsetY: TO,
			sprites: Sokoban.spritesheet.sprites()
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
		me.player = new Sokoban.Player({ world: this });
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

});

})(this);