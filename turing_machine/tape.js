function tape(name_svg)
{
	this.svg = d3.select(name_svg)
	var char_lst = []
	var mov_center_x = (tape.prototype.LENGTH_TAPE_REAL - 4) * tape.prototype.WIDTH_LATTICE / 2,
		mov_center_y = this.LENGTH_TAPE_REAL * 3 / 2
	this.svg.attr('viewBox', [-mov_center_x, -mov_center_y, mov_center_x * 2, mov_center_y * 2])
	this.svg.append('svg:defs')
		.append('svg:marker')
		.attr('id', 'end-arrow-tape')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 6)
		.attr('markerWidth', 3)
		.attr('markerHeight', 3)
		.attr('orient', 'auto')
		.append('svg:path')
		.attr('d', 'M0,-5L10,0L0,5')
		.attr('fill', '#000');
	var h = tape.prototype.HEIGHT_LATTICE, w_obj = tape.prototype.WIDTH_LATTICE
	for(var i = 0;i < tape.prototype.LENGTH_TAPE_REAL; ++i)
	{
		char_lst.push(' ')
	}
	this.lattices = this.svg.selectAll('g').data(char_lst).enter().append('g')
	this.lattices.append('rect').attr('class', 'rect_tape').attr('width', this.WIDTH_LATTICE).attr('height', this.HEIGHT_LATTICE)
	this.lattices.attr('transform', function(d, i)
	{
		var x = get_translation_orig(i)
		return 'translate(' + x + ',' + (-h / 2) + ')'
	})
	this.svg.append('line')
		.attr('x1', 0).attr('y1', h / 2 + 100)
		.attr('x2', 0).attr('y2', h / 2)
		.style('marker-end', 'url(#end-arrow-tape)')
		.attr('class', 'arrow-tape')
	this.movement = 0
	this.time_token = null
	this.moving_dir = 0
}
tape.prototype.LENGTH_TAPE_REAL = 15
tape.prototype.WIDTH_LATTICE = 100
tape.prototype.HEIGHT_LATTICE = 100
tape.prototype.MOVE_DELTA = 3
/*
messages:
msg_tape_finished
*/
//str is of length LENGTH_TAPE_REAL
//refresh the lattice position as well
tape.prototype.init = function(str)
{
	var lst = []
	for(var i = 0; i < this.LENGTH_TAPE_REAL; ++i)
	{
		lst.push(str[i])
	}
	this.lattices.data(lst)
	this.movement = 0
	this.lattices.selectAll('text').remove()
	this.lattices.append('text')
				.attr('x', this.WIDTH_LATTICE / 2)
				.attr('y', this.HEIGHT_LATTICE / 2)
				.attr('class', 'text_lattice')
				.text(function(d){return d})
	this.paint()
}
//move the lattices on tick
tape.prototype.tick = function()
{
	this.movement += this.MOVE_DELTA * this.moving_dir
	this.paint()
	if(Math.abs(this.movement) >= this.WIDTH_LATTICE)
	{
		clearInterval(this.time_token)
		//emit message on tape ready
		msg.emit('msg_tape_finished')
	}
}
tape.prototype.paint = function()
{
	var obj_tape = this
	var h = this.HEIGHT_LATTICE
	this.lattices.attr('transform', function(d, i)
	{
		var x = get_translation_orig(i) + obj_tape.movement
		return 'translate(' + x + ',' + (-h / 2) + ')'
	})
}
tape.prototype.on_fired = function(str, dir)
{
	this.init(str)
	this.moving_dir = -dir
	this.time_token = setInterval(obj_injection(this.tick, this), 50)
}
function get_translation_orig(i)
{
	return (i - (tape.prototype.LENGTH_TAPE_REAL) / 2) * tape.prototype.WIDTH_LATTICE
}