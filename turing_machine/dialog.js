//pass an empty div into this constructor
function dialog(name)
{
	this.container = d3.select(name)
	this.info = this.container.append('div')
	//response for msg_link_selected
	this.table_link_edit = null
	this.link_edit_info = null
	this.link_selected = null
	//response for input handling
	this.input_tape = null		//this is an array of numbers
	this.input_str = null		//regulated tape input
	//response for msg_node_selected
	this.state_selection = 0
	this.node_selected = null
	this.start_selected = false
	this.final_selected = false
	this.node_info = null		//also used in runtime update
	//response for runtime control
	this.state = null
	this.time_transition = 0
	this.div_info_run = null
}
dialog.prototype.help_text_set_input = 'set your tape here, please note that all non-number characters will be regarded as \'B\''
dialog.prototype.help_text_ready = 'welcome to this page!, you can design your turing machie freely now!, you can:'
dialog.prototype.PREPARE_ERROR = [
'start state has not been selected!',
'final state has not been selected!',
'tape has not been sat!'
]
dialog.prototype.RUN_READY = 0
dialog.prototype.RUN_SINGLE = 1
dialog.prototype.RUN_CONTINOUS = 2
/*
messages:
msg_link_update: link, transition_array[char, dir]
msg_tape_set: input_tape(in array form)
msg_setting_tape
msg_run_prepare
msg_dlg_back_to_ready
msg_fire_tm
msg_fire_tm_reverse
*/
dialog.prototype.on_link_selected = function(selected_link)
{
	var trans_sel = selected_link.link.transition, trans_choice = selected_link.choice
	this.link_selected = selected_link.link
	//generate form content array(copy so that link is not influenced)
	var transition_arry = []
	for(var i = 0; i < trans_sel.length; ++i)
	{
		var tmp = {}
		tmp.selected = true
		tmp.direction = trans_sel[i][1]
		tmp.character = trans_sel[i][0]
		tmp.char_change = trans_sel[i][2]
		transition_arry.push(tmp)
	}
	for(var i = 0; i < trans_choice.length; ++i)
	{
		var tmp = {}
		tmp.selected = false
		tmp.direction = -1
		tmp.character = trans_choice[i]
		tmp.char_change = 0
		transition_arry.push(tmp)
	}
	transition_arry.sort((a, b)=>(a.character - b.character))
	//generating container's layout
	this.container.selectAll('*').remove()
	this.container.append('p').text('source:' + this.link_selected.source.name)
	this.container.append('p').text('target:' + this.link_selected.target.name)
	var div_info = this.container.append('div')
	this.table_link_edit = this.create_link_info_table(div_info, transition_arry)
	this.link_edit_info = transition_arry
}
dialog.prototype.create_link_info_table = function(div, transition)
{
	var table = div.append('table').attr('class', 'table-bordered')
	var head = table.append('thead').append('tr')
	head.append('th').text('character')
	head.append('th').text('selected')
	head.append('th').text('direction')
	head.append('th').text('change to')
	var body = table.selectAll('tr').filter(function(){return false}).data(transition).enter().append('tr')
	//generate characters
	body.append('td').text(function(d){return turing_machine.prototype.translate_char(d.character)})
	//generate checkbox according to selection
	body.append('td')
		.append('input')
		.attr('type', 'checkbox')
		.each(function(d){
			this.checked = d.selected
		})
		.on('click', function(d){
			d.selected = this.checked
			d3.event.stopPropagation()
		})
	var sel = body.append('td').append('select')
	sel.append('option').text('L').each(function(d){
		this.selected = true
		if(d.selected)
		{this.selected = (d.direction === -1)}
	})
	.on('click', function(d){
		d.direction = -1
		d3.stopPropagation()
	})
	sel.append('option').text('R')
	.each(function(d)
		{
			this.selected = false
			if(d.selected)
				this.selected = d.direction === 1
		})
	.on('click', function(d)
	{
		d.direction = 1
	})
	var sel_change = body.append('td').append('select')
	for(var i = 0; i < turing_machine.prototype.MAX_CHAR_COUNT; ++ i)
	{
		var op = sel_change.append('option').text(turing_machine.prototype.translate_char(i)).each(function(d)
		{
			this.__id_change__ = i
			this.selected = d.char_change === i
		})
		.on('click', function(d)
		{
			d.char_change = this.__id_change__
		})
	}
	return table
}
dialog.prototype.on_back_to_ready = function()
{
	this.container.selectAll('*').remove()
	//paste help information here
	this.container.append('div').append('p').text(this.help_text_ready)
	var ul =  this.container.append('ul').attr('class', 'list-group')
	ul.append('li').text('press \"m\" to arrange layout manually')
	ul.append('li').text('press \"a\" to arrange layout automatically(press again to quit)')
	ul.append('li').text('choose a node or link then edit it')
	ul.append('li').text('return to this dialog at any time by pressing \"esc\"')
	ul.selectAll('li').attr('class', 'list-group-item')
	var obj_dlg = this
	var btns = this.container.append('div').attr('class', 'dlg-btn-container')
	btns.append('button').text('run!')
		.on('click', function()
		{
			msg.emit('msg_run_prepare')
		})
	btns.append('button').text('set input')
		.on('click', function()
		{
			msg.emit('msg_setting_tape')
			obj_dlg.set_input_clicked()
		})
	btns.append('button').text('save')
		.on('click', function()
		{
			msg.emit('msg_save')
		})
	btns.append('button').text('click here to try a model')
		.on('click', function()
		{
			msg.emit('msg_model_required')
		})
	btns.selectAll('button').attr('type', 'button').attr('class', 'btn btn-default')
}
dialog.prototype.set_input_clicked = function()
{
	this.container.selectAll('*').remove()
	this.container.append('p').text(this.help_text_set_input)
	var txt = this.container.append('textarea').attr('rows', 8).attr('class', 'form-control').text(this.input_str)
	var obj_dlg = this
	this.container.append('button').attr('class', 'btn btn-default')
					.text('set')
					.on('click', function()
					{
						obj_dlg.input_set(txt.node().value)
					})
}
dialog.prototype.input_set = function(str)
{
	var arr_tape = []
	for(var i = 0;i < str.length; ++i)
	{
		arr_tape.push(turing_machine.prototype.translate_char_rev(str[i]))
	}
	var arr_regulated = []
	for(var i = 0; i < arr_tape.length; ++i)
	{
		arr_regulated.push(turing_machine.prototype.translate_char(arr_tape[i]))
	}
	this.input_str = arr_regulated.join('')
	this.input_tape = arr_tape
	msg.emit('msg_tape_set', this.input_tape)
}
dialog.prototype.on_prepare_error = function(type)
{
	this.container.selectAll('*').remove()
	this.container.append('p').text(this.PREPARE_ERROR[type])
	this.container.append('button')
			.attr('type', 'button')
			.attr('class', 'btn btn-default')
			.text('ok')
			.on('click', function()
			{
				msg.emit('msg_dlg_back_to_ready')
			})
}
dialog.prototype.on_exit_link_selected = function()
{
	var new_transition = []
	for(var i = 0; i < this.link_edit_info.length; ++i)
	{
		if(this.link_edit_info[i].selected)
			new_transition.push([this.link_edit_info[i].character, this.link_edit_info[i].direction, this.link_edit_info[i].char_change])
	}
	msg.emit('msg_link_update',this.link_selected, new_transition)
	this.on_back_to_ready()
}
dialog.prototype.on_node_selected = function(node, link_array)
{
	var obj_dlg = this
	this.container.selectAll('*').remove()
	//generate node infomation table here
	var form = this.container.append('form').attr('class', 'form').attr('role', 'form')
	var name_div = form.append('div').attr('class', 'form-group')
	name_div.append('p').attr('class', 'help-block').text('node name')
	name_div.append('input').attr('type', 'input')
			.on('input', function()
			{
				obj_dlg.node_selected.name = this.value
			})
			.attr('class', 'form-control').node().value = node.name
	form.append('p').attr('class', 'help-block').text('node infomation')
	var arr_info = this.create_node_info_array(node, link_array)
	var table = this.create_node_info_table(arr_info, form)
	var box_start = form.append('div').attr('class', 'form-group')
		.append('label').text('set as start')
		.append('input').attr('type', 'checkbox')
		.on('click',function()
		{
			obj_dlg.start_selected = this.checked
		}).node()
		if(node.is_start)
		{
			box_start.checked = true
		}
		this.start_selected = box_start.checked
	var box_final = form.append('div').attr('class', 'form-group')
					.append('label').attr('for', 'start').text('set as final')
					.append('input').attr('type', 'checkbox')
					.on('click',function()
					{
						obj_dlg.final_selected = this.checked
					}).node()
		if(node && node.is_final)
		{
			box_final.checked = true
		}
		this.final_selected = box_final.checked
		this.node_selected = node
	this.container.append('p').text('press delete to delete this node')
	this.container.append('p').text('press t to add links to other nodes')
}
dialog.prototype.on_exit_node_selected = function()
{
	msg.emit('msg_node_update', this.node_selected, this.start_selected, this.final_selected)
	this.on_back_to_ready()
}
dialog.prototype.on_prepare_succeed = function()
{
	this.state = this.RUN_READY
	this.time_transition = 0
	this.container.selectAll('*').remove()
	var obj_dlg = this
	var btn_ctn = this.container.append('div').attr('class', 'dlg-btn-container')
	this.btn_sgl =	btn_ctn.append('button')
					.attr('type', 'button')
					.attr('class', 'btn btn-default')
					.text('single step')
					.on('click', function()
					{
						obj_dlg.run_single()
					}).node()
	this.btn_ctn = btn_ctn.append('button')
					.attr('type', 'button')
					.attr('class', 'btn btn-default')
					.text('fire continuly')
					.on('click', function()
					{
						if(obj_dlg.state === obj_dlg.RUN_READY)
						{
							this.textContent = 'stop'
							obj_dlg.btn_sgl.disabled = true
							obj_dlg.btn_ret.disabled = true
							obj_dlg.btn_last.disabled = true
							obj_dlg.run_continous()
							return
						}
						if(obj_dlg.state === obj_dlg.RUN_CONTINOUS)
						{
							this.textContent = 'fire continuly'
							obj_dlg.state = obj_dlg.RUN_SINGLE
							obj_dlg.btn_sgl.disabled = false
							obj_dlg.btn_ret.disabled = false
							obj_dlg.btn_last.disabled = false
							return
						}
					}).node()
	this.btn_last = btn_ctn.append('button')
					.attr('type', 'button')
					.attr('class', 'btn btn-default')
					.text('last step')
					.on('click', function()
					{
						obj_dlg.run_last_step()
					}).node()
	this.btn_last.disabled = true
	this.btn_ret = btn_ctn.append('button')
					.attr('type', 'button')
					.attr('class', 'btn btn-default')
					.text('return')
					.on('click', function()
					{
						obj_dlg.run_return()
					}).node()
	this.div_info_run = this.container.append('div')
}
dialog.prototype.run_single = function()
{
	this.state = this.RUN_SINGLE
	msg.emit('msg_fire_tm')
}
dialog.prototype.run_continous = function()
{
	this.state = this.RUN_CONTINOUS
	msg.emit('msg_fire_tm')
}
dialog.prototype.run_last_step = function()
{
	msg.emit('msg_fire_tm_reverse')
}
dialog.prototype.run_return = function()
{
	msg.emit('msg_dlg_back_to_ready')
}
//only accepted when firing normally
dialog.prototype.on_tape_finished = function()
{
	if(this.state === this.RUN_SINGLE)
	{
		this.state = this.RUN_READY
		//enable other buttons
	}
	else
	{
		//state === RUN_CONTINUE
		msg.emit('msg_fire_tm')
	}
}
dialog.prototype.on_fired_node_info = function(node, link_array, state, tape_contont)
{
	this.div_info_run.selectAll('*').remove()
	var arr_info = this.create_node_info_array(node, link_array)
	var table = this.create_node_info_table(arr_info, this.div_info_run)
	//highlight transitions
	for(var i = 0; i < arr_info.length; ++i)
	{
		if(arr_info[i].on === tape_contont)
			arr_info[i].highlight = true
	}
	table.classed('transition_info', function(d)
	{
		return d.highlight
	})

	switch(state)
	{
	case 0:
		//normal
		this.time_transition++
		if(this.state === this.RUN_SINGLE)
		{
			this.btn_last.disabled = false
		}
		break
	case 1:
		//finished
		this.div_info_run.append('p').text('congratulations, finished!')
		break
	case 2:
		this.div_info_run.append('p').text('the machine halted!')
		break;
	case 3:
		//reverse
		this.time_transition--
		if(this.time_transition == 0)
		{
			this.btn_last.disabled = true
		}
		break
	}
}
//format:{name(target), on(number), dir:number, change_to:number}
dialog.prototype.create_node_info_array = function(node, link_array)
{
	var arr_info_node = []
	for(var i = 0; i < link_array.length; ++i)
	{
		for(var j = 0; j < link_array[i].transition.length; ++j)
		{
			var tmp = {}
			var trans = link_array[i].transition[j]
			tmp.name = link_array[i].target.name
			tmp.on = trans[0]
			tmp.change_to = trans[2]
			tmp.direction = trans[1]
			arr_info_node.push(tmp)
		}	
	}
	//creating a table
	return arr_info_node
}
dialog.prototype.create_node_info_table = function(info_array, div_table)
{
	var table =	div_table.append('table').attr('class', 'table table-bordered')
	var head = table.append('thead').append('tr').classed('node_info', true)
	head.append('th').text('target name')
	head.append('th').text('on')
	head.append('th').text('direction')
	head.append('th').text('change to')
	var body = table.selectAll('tr').filter(function(){return false}).data(info_array).enter().append('tr').classed('node_info', true)
	body.append('td').text(function(d){return d.name})
	body.append('td').text(function(d){return turing_machine.prototype.translate_char(d.on)})
	body.append('td').text(function(d){return (d.direction === 1 ? 'R' : 'L')})
	body.append('td').text(function(d){return turing_machine.prototype.translate_char(d.change_to)})
	return body
}