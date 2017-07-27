function view_graph(name_svg)
{
	this.svg = d3.select(name_svg)
	var width = this.svg.attr('width'),	height = this.svg.attr('height');
	this.svg.attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
	//{x:, y:, id:, obj_graph:, name:'q'+this.last_node_id.toString(), is_start, is_final}
	this.nodes = []
	//linkformat:{source:, target:, transition:array([char_id, dir, change_to])}
	this.links = []
	this.last_node_id = 0
	//creating circles and links in svg
	this.svg.append('svg:defs')
		.append('svg:marker')
		.attr('id', 'end-arrow')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 6)
		.attr('markerWidth', 3)
		.attr('markerHeight', 3)
		.attr('orient', 'auto')
		.append('svg:path')
		.attr('d', 'M0,-5L10,0L0,5')
		.attr('fill', '#000');
	this.svg_dom = this.svg.node()
	this.svg.data([this])
	this.svg.on('click', function(d)
	{
		d.clicked(d3.mouse(this), d.OBJ_SVG, this)
	})
	.on('mousedown', function(d)
	{
		d.drag(view_graph.prototype.DRAG_SVG_PRESSED, d3.mouse(this), this)
	})
	.on('mouseup', function(d)
	{
		d.drag(view_graph.prototype.DRAG_MOUSE_UP, d3.mouse(this), this)
	})
	.on('mousemove', function(d)
		{
			d3.event.preventDefault()
			d.drag(view_graph.prototype.DRAG_MOUSE_MOVE, d3.mouse(this), this)
			d3.event.stopPropagation()
		})
	.on('drag', function(){
		d3.event.preventDefault()
	})
	//svg selections
	//this.path = this.svg.append('svg:g').selectAll('path')
	//this.circle = this.svg.append('svg:g').selectAll('g')
	this.path = this.svg.append('g')
	this.circle = this.svg.append('g')
	//control variables
	this.state = view_graph.prototype.READY
	this.selected_node = null			//object:{node:node_obj, transition:array([char_id, node_obj])}
	this.selected_link = null			//object:{link:lk_obj, choice:array(char_id)}
	this.force_enabled = false
	this.drag_last_pos = null			//pos used to simulate drag on nodes and svg
	this.node_moved = null
	//other variables needed for compiling tm
	this.tape = null					//number array used to compile a turing machine
	this.start_node = null
	this.final_node = null
	//runtime variables
	this.node_hit = null
	//develop code
}
view_graph.prototype.READY = 0
view_graph.prototype.NODE_SELECTED = 1
view_graph.prototype.NODE_ADD_LINK = 2
view_graph.prototype.LINK_SELECTED = 3
view_graph.prototype.MOVING = 4
view_graph.prototype.SET_TAPE = 5
view_graph.prototype.RUN = 6
view_graph.prototype.PREPARE_ERROR = 7

view_graph.prototype.OBJ_SVG = 0
view_graph.prototype.OBJ_NODE = 1
view_graph.prototype.OBJ_LINK = 2

view_graph.prototype.DRAG_NODE_PRESSED = 0
view_graph.prototype.DRAG_SVG_PRESSED = 1
view_graph.prototype.DRAG_MOUSE_MOVE = 2
view_graph.prototype.DRAG_MOUSE_UP = 3

var key_code_esc = 27
/*
messages send:
msg_node_selected: this.selected_node {node, transition}, is_start_ok, is_final_ok
msg_link_selected: this.selected_link	{link, choice}
msg_exit_node_selected
msg_exit_link_selected
msg_node_delete
msg_link_delete
msg_back_to_ready
msg_prepare_error: state(0, 1, 2)   0:start unprepared, 1:final unprepared, 2:tape_unprepared
msg_prepare_succeed
msg_tm_compiled: transition_table, tape, final_state, runtime_info
msg_fired_node_info:	node, link_array
msg_fired_tape_info:	str
msg_tape_init:			str
*/
//click event handler, event is the mouse position(d3.mouse(this)), obj is the event's target
view_graph.prototype.clicked = function(event, type, obj)
{
	switch(this.state)
	{
	case this.READY:
		this.clicked_ready(event, type, obj)
		break
	case this.NODE_ADD_LINK:
		//judgement has been made when pressin 't'
		this.click_add_link(event, type, obj)
		break
	}
	this.edit_update()
}
view_graph.prototype.clicked_ready = function(event, type, obj)
{
	switch(type)
	{
	case this.OBJ_SVG:
		this.add_node(event[0], event[1])
		break
	case this.OBJ_NODE:
		this.state = this.NODE_SELECTED
		this.selected_node = {node:obj, transition:this.get_node_transition(obj)}
		msg.emit('msg_node_selected', obj, this.get_link(obj), this.start_node === null, this.final_node === null)
		break
	case this.OBJ_LINK:
		this.state = this.LINK_SELECTED
		this.selected_link = {link:obj, choice:this.get_possible_transition(obj.source)}
		msg.emit('msg_link_selected', this.selected_link)
		break
	}
}
view_graph.prototype.click_add_link = function(event, type, obj)
{
	if(type !== this.OBJ_NODE)
		return
	var lk = this.add_link(this.selected_node.node, obj)
	this.selected_link = {link:lk, choice:this.get_possible_transition(obj.source)}
	this.state = this.LINK_SELECTED
	msg.emit('msg_link_selected', this.selected_link)
}
view_graph.prototype.get_node_transition = function(node)
{
	//find the node's current transition set
	var array_transition = new Array()
	for(var link of this.links)
	{
		if(link.source === node)
		{
			for(var t of link.transition)
			{
				array_transition.push([t[0], t[1]])
			}
		}
	}
	array_transition.sort((a,b)=>{return a[0] - b[0]})
	return array_transition
}
view_graph.prototype.get_link = function(node)
{
	var lst = []
	for(var i = 0; i < this.links.length; ++i)
	{
		if(this.links[i].source === node)
			lst.push(this.links[i])
	}
	return lst
}
view_graph.prototype.get_possible_transition = function(node)
{
	var a_trans_sel = this.get_node_transition(node)
	var a_trans_choice = new Array()
	for(var i = 0; i < a_trans_sel.length; ++i)
	{
		a_trans_choice[a_trans_sel[i][0]] = true
	}
	var result = new Array()
	for(var i = 0; i < turing_machine.prototype.MAX_CHAR_COUNT; ++i)
	{
		if(!a_trans_choice[i])
			result.push(i)
	}
	result.sort((a,b)=>{return a-b})
	return result
}
//change node's structure here
view_graph.prototype.add_node = function(p_x, p_y)
{
	//svg entry stands for parent svg's coordinate
	var node = {x:p_x, y:p_y, id:this.last_node_id++, 
		obj_graph:this, name:'q'+this.last_node_id.toString()}				//vx and vy are only used by force simulator
	this.nodes.push(node)
	//dev
	/*
	node.watch('x', function(id, v_0, v_1){
		console.log(v_0 + ' ' + v_1)
		return v_1
	})
	node.watch('vx',function(id, v_0, v_1)
	{
		console.log('vx change to' + v_1)
	})*/

	return node
}
view_graph.prototype.add_link = function(pt_s, pt_t)
{
	//{source:, target:, transition:array([char_id, dir])}
	//check if there is duplicate one first
	for(var i = 0; i < this.links.length; ++i)
	{
		if(this.links[i].source === pt_s && this.links[i].target === pt_t)
			return this.links[i]
	}
	var link = {source:pt_s, target:pt_t, transition:new Array(), obj_graph:this}
	this.links.push(link)
	return link
}
//keydown handler
view_graph.prototype.keydown = function(event)
{
	switch(this.state)
	{
	case this.READY:
		this.keydown_ready(event)
		break
	case this.NODE_SELECTED:
		this.keydown_node_selected(event)
		break
	case this.NODE_ADD_LINK:
		this.keydown_node_add_lk(event)
		break
	case this.LINK_SELECTED:
		this.keydown_lk_selected(event)
		break
	case this.MOVING:
		if(event.keyCode === key_code_esc)
		{
			this.state = this.READY
		}
	}
}
view_graph.prototype.keydown_ready = function(event)
{
	switch(event.keyCode)
	{
	case 77:
		//'m' is pressed
		if(!this.force_enabled)
		{
			this.state = this.MOVING
		}
		break
	case 65:
		//'a' is pressed
		this.force_enabled = !this.force_enabled
		if(!this.force_enabled)
		{
			this.force.stop()
		}
		//this.force.force("charge", d3.forceManyBody().strength(-500).distanceMax(100))
    	//		.force("link", d3.forceLink(this.links).distance(150));
		this.edit_update()
		break
	}
}
view_graph.prototype.keydown_node_selected = function(event)
{
	var valid = true
	switch(event.keyCode)
	{
	case 84:
		//'t' is pressed
		if(this.selected_node.transition.length < turing_machine.prototype.MAX_CHAR_COUNT)
		{
			this.state = this.NODE_ADD_LINK
		}
		break
	case 27:
		//'esc' is pressed
		this.state = this.READY
		msg.emit('msg_exit_node_selected')
		break
	case 46:
		//'delete' is pressed
		this.delete_node(this.selected_node.node)
		this.state = this.READY
		msg.emit('msg_back_to_ready')
		break
	default:
		valid = false
	}
	if(valid)
		this.edit_update()
}
view_graph.prototype.keydown_node_add_lk = function(event)
{
	//exit adding link when 'esc' or 't' is selected
	if(event.keyCode === 27 || event.keyCode === 84)
	{
		this.state = this.NODE_SELECTED
		this.edit_update()
	}
}
view_graph.prototype.keydown_lk_selected = function(event)
{
	var valid = true
	switch(event.keyCode)
	{
	case 27:
		//esc
		this.state = this.READY
		msg.emit('msg_exit_link_selected')
		break
	case 46:
		//delete
		this.state = this.READY
		this.links = array_delete(this.links.indexOf(this.selected_link.link), this.links)
		msg.emit('msg_link_delete')
		break
	default:
		valid = false
		break
	}
	if(valid)
	{
		this.edit_update()
	}
}
view_graph.prototype.delete_node = function(node)
{
	//delete this node and all relevent links
	var idx_node = this.nodes.indexOf(node)
	if(idx_node < 0)
		return
	var lk_to_del = []
	for(var i = 0; i < this.links.length; ++i)
	{
		if(this.links[i].source === node || this.links[i].target === node)
			lk_to_del.push(this.links[i])
	}
	for(var i = 0; i < lk_to_del.length; ++i)
	{
		this.links = array_delete(this.links.indexOf(lk_to_del[i]), this.links)
	}
	this.start_node = this.start_node === node ? null : this.start_node
	this.final_node = this.final_node === node ? null : this.final_node
	this.nodes = array_delete(this.nodes.indexOf(node), this.nodes)
}
function array_delete(idx, array)
{
	var arr_tmp_1 = array.slice(0, idx), arr_tmp_2 = array.slice(idx + 1, array.length)
	array = arr_tmp_1.concat(arr_tmp_2)
	return array
}
//a function that simulates drag effect when state is moving
//in svg's mousedown listener, use _data_ to get target's(if not itself's) data
view_graph.prototype.drag = function(type_event, pos_mouse, obj)
{
	if(this.state !== this.MOVING)
		return
	switch(type_event)
	{
	case this.DRAG_NODE_PRESSED:
		this.drag_last_pos = [pos_mouse[0], pos_mouse[1]]
		this.moving_state = 0
		this.node_moved = obj
		break
	case this.DRAG_SVG_PRESSED:
		this.drag_last_pos = [pos_mouse[0], pos_mouse[1]]
		this.moving_state = 1
		this.drag_last_pos_client = this.compute_client_pos(pos_mouse)
		break
	case this.DRAG_MOUSE_MOVE:
		if(this.drag_last_pos)
		{
			switch(this.moving_state)
			{
			case 0:
				//change node's position, update by edit_update
				this.node_moved.x += pos_mouse[0] - this.drag_last_pos[0]
				this.node_moved.y += pos_mouse[1] - this.drag_last_pos[1]
				break;
			case 1:
				//change svg's view port
				var pos_client = this.compute_client_pos(pos_mouse)
				var arr_vb = this.svg.attr('viewBox').split(' ')
				arr_vb[0] = Number(arr_vb[0]) + pos_client[0] - this.drag_last_pos_client[0]
				arr_vb[1] = Number(arr_vb[1]) + pos_client[1] - this.drag_last_pos_client[1]
				this.svg.attr('viewBox', arr_vb.join(' '))
				this.drag_last_pos_client = pos_client
				break
			}
			this.drag_last_pos = [pos_mouse[0], pos_mouse[1]]
		}
		break
	case this.DRAG_MOUSE_UP:
		this.drag_last_pos = null
		this.node_moved = null
		break
	}
	this.edit_update()
}
view_graph.prototype.compute_client_pos = function(pos_mouse)
{
	var arr_wbx = this.svg.attr('viewBox').split(' ')
	arr_wbx[0] = Number(arr_wbx[0])
	arr_wbx[1] = Number(arr_wbx[1])
	var pos_client = [pos_mouse[0] - arr_wbx[0], pos_mouse[1] - arr_wbx[1]]
	return pos_client
}
//update svg elements using selection
view_graph.prototype.edit_update = function()
{
	var obj_graph = this
	var path = this.path.selectAll('path').data(this.links), 
	circle = this.circle.selectAll('g').data(this.nodes, function(d){return d.id})
	path.exit().remove()
	circle.exit().remove()
	path.enter().append('path')
				.attr('class', 'link')
				.style('marker-end', 'url(#end-arrow)')
				.on('click', function(d)
				{
					obj_graph.clicked(d3.mouse(obj_graph.svg_dom), view_graph.prototype.OBJ_LINK, d)
				})
				.merge(path)
				.classed('selected', function(d)
				{
					if(obj_graph.state === view_graph.prototype.LINK_SELECTED)
						return d === obj_graph.selected_link.link
					return false
				})
	//move events are handled by svg element
	var g = circle.enter().append('g')
	g.append('circle')
				.attr('class', 'node')
				.attr('r', 12)
				.on('click', function(d)
				{
					obj_graph.clicked(d3.mouse(obj_graph.svg_dom), view_graph.prototype.OBJ_NODE, d)
					d3.event.stopPropagation()
				})
				.on('mousedown', function(d)
				{
					obj_graph.drag(view_graph.prototype.DRAG_NODE_PRESSED, d3.mouse(obj_graph.svg_dom), d)
					d3.event.stopPropagation()
				})
	g.append('text').attr('x', 0).attr('y', 20)
		.text(function(d)
		{
			return d.name
		})
	g.merge(circle).selectAll('circle')
				.classed('selected', function(d){
					if(obj_graph.state === view_graph.prototype.NODE_SELECTED ||
						obj_graph.state === view_graph.prototype.NODE_ADD_LINK)
						return d === obj_graph.selected_node.node
					return false})
				.classed('moving', function(d)
				{
					if(obj_graph.state === view_graph.prototype.MOVING)
						return d === obj_graph.node_moved
					return false
				})
	g.merge(circle).selectAll('text')
		.text(function(d)
		{
			return d.name + (d === obj_graph.start_node ? '(start)' : '') + (d === obj_graph.final_node ? '(final)' : '')
		})
	/*
	circle.enter().append('g')
				.append('circle')
				.attr('class', 'node')
				.attr('r', 12)
				.on('click', function(d)
				{
					obj_graph.clicked(d3.mouse(obj_graph.svg_dom), view_graph.prototype.OBJ_NODE, d)
					d3.event.stopPropagation()
				})
				.on('mousedown', function(d)
				{
					obj_graph.drag(view_graph.prototype.DRAG_NODE_PRESSED, d3.mouse(obj_graph.svg_dom), d)
					d3.event.stopPropagation()
				})
				.merge(circle)
				.selectAll('circle')
				.classed('selected', function(d){
					if(obj_graph.state === view_graph.prototype.NODE_SELECTED ||
						obj_graph.state === view_graph.prototype.NODE_ADD_LINK)
						return d === obj_graph.selected_node.node
					return false})
				.classed('moving', function(d)
				{
					if(obj_graph.state === view_graph.prototype.MOVING)
						return d === obj_graph.node_moved
					return false
				})
	*/
	this.position_update()
	if(this.force_enabled && this.state === this.READY)
	{
		this.force = d3.forceSimulation(this.nodes)
    	.force("charge", d3.forceManyBody().strength(-500))
    	.force("link", d3.forceLink(this.links).distance(150))
	    .on('tick', obj_injection(view_graph.prototype.force_tick, this))
	}
}
view_graph.prototype.position_update = function()
{
	var path = this.path.selectAll('path'),
	circle = this.circle.selectAll('g')
	path.attr('d', function(d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = 12,
        targetPadding = 17,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
  	});
	circle.attr('transform',function(d){return 'translate(' + d.x + ',' + d.y + ')'});
}
view_graph.prototype.update_run = function()
{
	var obj_graph = this
	this.circle.selectAll('circle').classed('hit', function(d)
	{
		return d === obj_graph.node_hit
	})
	var arr_wbx = this.svg.attr('viewBox').split(' ')
	for(var i = 0; i < 4; ++i)
	{arr_wbx[i] = Number(arr_wbx[i])}
	if(Math.abs(this.node_hit.x - arr_wbx[0]) > arr_wbx[2] ||
		Math.abs(this.node_hit.y - arr_wbx[1]) > arr_wbx[3])
	{
		//move view port to center
		arr_wbx[0] += this.node_hit.x - arr_wbx[0] - arr_wbx[2] / 2
		arr_wbx[1] += this.node_hit.y - arr_wbx[1] - arr_wbx[3] / 2
		this.svg.attr('viewBox', arr_wbx.join(' '))
	}
}
view_graph.prototype.force_tick = function()
{
	this.position_update()
}
//msg response function
//this.links = array_delete(this.links.indexOf(this.link_selected), this.links)
view_graph.prototype.on_link_update = function(link, transition_array)
{
	if(transition_array.length === 0)
	{
		this.links = array_delete(this.links.indexOf(link), this.links)
		return;
	}
	link.transition = transition_array
}
view_graph.prototype.on_tape_set = function(input_tape)
{
	this.tape = input_tape
	if(this.tape.length === 0)
		this.tape = null
	this.state = this.READY
	msg.emit('msg_back_to_ready')
}
view_graph.prototype.on_setting_tape = function()
{
	this.state = this.SET_TAPE
}
view_graph.prototype.on_node_update = function(node, start_selected, final_selected)
{
	if(start_selected)
	{
		if(this.start_node)
			this.start_node.is_start = undefined
		this.start_node = node
		node.is_start = true
	}
	if(node.is_start && !start_selected)
	{
		node.is_start = false
		this.start_node = null
	}
	if(final_selected)
	{
		if(this.final_node)
			this.final_node.is_final = undefined
		this.final_node = node
		node.is_final = true
	}
	if(node.is_final && !final_selected)
	{
		node.is_final = false
		this.final_node = null
	}
}
view_graph.prototype.on_run_prepare = function()
{
	if(!this.start_node)
	{
		msg.emit('msg_prepare_error', 0)
		this.state = this.PREPARE_ERROR
		return
	}
	if(!this.final_node)
	{
		msg.emit('msg_prepare_error', 1)
		this.state = this.PREPARE_ERROR
		return
	}
	if(!this.tape)
	{
		msg.emit('msg_prepare_error', 2)
		this.state = this.PREPARE_ERROR
		return
	}
	//compiling turing machine
	this.compile_tm()
	msg.emit('msg_prepare_succeed')										//dlg prepare runtime_surface
	this.state = this.RUN
}
view_graph.prototype.compile_tm = function()
{
	var tb_trans = new Array()
	for(var i = 0; i < this.nodes.length; ++i)
	{
		tb_trans.push([])
		this.nodes[i].idx_temp_comp = i
	}
	for(var i = 0; i < this.links.length; ++i)
	{
		var lk = this.links[i]
		for(var j = 0; j < lk.transition.length; ++j)
		{
			var tmp = {}
			tb_trans[lk.source.idx_temp_comp][lk.transition[j][0]] = tmp
			tmp.state = lk.target.idx_temp_comp
			tmp.dir = lk.transition[j][1]
			tmp.change = lk.transition[j][2]	
		}
	}
	this.tb_trans_comp = tb_trans
	this.runtime = new Object()
	this.runtime.idx_state = this.start_node.idx_temp_comp
	this.runtime.idx_tape = 0
	msg.emit('msg_tm_compiled', this.tb_trans_comp, this.tape,
	 this.final_node.idx_temp_comp, this.runtime)		//tm get table and runtime
	//init tape view
	var s = -(tape.prototype.LENGTH_TAPE_REAL - 1) / 2, 
		e = (tape.prototype.LENGTH_TAPE_REAL - 1) / 2 + 1;
	msg.emit('msg_tape_init', turing_machine.prototype.translate_char_lst(this.create_tape_slice(s, e)))
}
view_graph.prototype.on_dlg_back_to_ready = function()
{
	this.state = this.READY
	msg.emit('msg_back_to_ready')
}
view_graph.prototype.on_tm_fired = function(runtime, state, tape_new)
{
	this.tape = tape_new
	var node = this.nodes[runtime.idx_state]
	this.node_hit = node
	msg.emit('msg_fired_node_info', node, this.get_link(node), state)
	//virations on tape's update(instant/animation)
	var s = runtime.idx_tape - (tape.prototype.LENGTH_TAPE_REAL - 1) / 2,
		e = runtime.idx_tape + (tape.prototype.LENGTH_TAPE_REAL - 1) / 2 + 1;
	if(state === 0)
	{
		s -= runtime.dir
		e -= runtime.dir
		msg.emit('msg_fired_tape_info', turing_machine.prototype.translate_char_lst(this.create_tape_slice(s, e))
			, runtime.dir)
	}
	else
	{
		//instant update
		msg.emit('msg_tape_init', turing_machine.prototype.translate_char_lst(this.create_tape_slice(s, e)))
	}
	//update viewbox and circle
	this.update_run()
}
//length shall be odd
view_graph.prototype.create_tape_slice = function(s, e)
{
	var arr_raw = this.tape.slice(s < 0 ? 0 : s, e > this.tape.length ? this.tape.length : e)
	function create_empty_arr(length)
	{
		var a = []
		for(var i = 0; i < length; ++i)
		{
			a.push(0)
		}
		return a
	}
	if(s < 0)
	{
		arr_raw = create_empty_arr(-s).concat(arr_raw)
	}
	if(e > this.tape.length)
	{
		arr_raw = arr_raw.concat(create_empty_arr(e - this.tape.length))
	}

	return arr_raw
}

/*
//test code
d3.select('body').append('svg')
				.attr('id', 'svg-graph')
				.attr('width', 800)
				.attr('height', 800)
var graph = new view_graph('#svg-graph')
d3.select(window).on('keydown', function(){graph.keydown(d3.event)})

function test_attr(d)
{
	return 'translate(' + d.x + ',' + d.y + ')';
}*/