function turing_machine()
{
	this.runtime_state = new Object()
	this.runtime_state.idx_state = null
	this.runtime_state.idx_tape = null
	this.runtime_state.dir = null		//since this object is passed to ivew_graph and is needed by tape
	this.tape = null					//a number array, passed by graph
	this.table_transition = null		//array, each entry is an array, whose entries's format is:{state, change, dir}
	this.history = []					//array, each entry format:{idx_state, back_dir, char_origin}
	this.idx_end_state = null
	this.tape_redundancy = new Array()
	for(var i = 0;i < 100; ++i)
	{
		this.tape_redundancy.push(0)
	}
}
//the first char will always be used as blank
turing_machine.prototype.MAX_CHAR_COUNT = 11
//message emited: msg_fired: runtime_state, move_state(0, 1, 2, 3)
//0: normal; 1: finished, 2: rejected, 3:reverse

turing_machine.prototype.fire = function()
{
	if(this.runtime_state.idx_state === this.idx_end_state)
	{
		msg.emit('msg_fired', this.runtime_copy(), 1, this.tape)
		return
	}
	var trans = this.table_transition[this.runtime_state.idx_state][this.tape[this.runtime_state.idx_tape]]
	if(!trans)
	{
		msg.emit('msg_fired', this.runtime_copy(), 2, this.tape)
		return
	}
	var history_record = new Object()
	history_record.idx_state = this.runtime_state.idx_state
	history_record.back_dir = -trans.dir
	history_record.char_origin = this.tape[this.runtime_state.idx_tape]
	this.history.push(history_record)
	this.runtime_state.idx_state = trans.state
	this.tape[this.runtime_state.idx_tape] = trans.change
	this.runtime_state.idx_tape += trans.dir
	this.runtime_state.dir = trans.dir
	//enlarge tape if necessary
	if(this.runtime_state.idx_tape < 0)
	{
		this.tape = this.tape_redundancy.concat(this.tape)
		this.runtime_state.idx_tape = this.tape_redundancy.length - 1
	}
	if(this.runtime_state.idx_tape >= this.tape.length)
	{
		this.tape = this.tape.concat(this.tape_redundancy)
	}
	msg.emit('msg_fired', this.runtime_copy(), 0, this.tape)
}
//called by dlg object, make sure to check before invoking
turing_machine.prototype.fire_back = function()
{
	var rec = this.history.pop()
	this.runtime_state.idx_state = rec.idx_state
	this.runtime_state.idx_tape += rec.back_dir
	this.tape[this.runtime_state.idx_tape] = rec.char_origin
	msg.emit('msg_fired', this.runtime_copy(), 3, this.tape)
}

turing_machine.prototype.runtime_copy = function()
{
	var rt = new Object()
	rt.idx_state = this.runtime_state.idx_state
	rt.idx_tape = this.runtime_state.idx_tape
	rt.dir = this.runtime_state.dir
	return rt
}
turing_machine.prototype.translate_char = function(num)
{
	if(num === 0)
	{
		return 'B'
	}
	return (num - 1).toString()
}
turing_machine.prototype.translate_char_rev = function(c)
{
	if(c >= '0' && c <= '9')
		return Number(c) + 1;
	return 0
}
turing_machine.prototype.translate_char_lst = function(num_array)
{
	for(var i = 0; i < num_array.length; ++i)
	{
		num_array[i] = this.translate_char(num_array[i])
	}
	return num_array.join('')
}
//msg responses
turing_machine.prototype.on_fire_tm = function()
{
	this.fire()
}
turing_machine.prototype.on_fire_tm_reverse = function()
{
	this.fire_back()
}
turing_machine.prototype.on_tm_compiled = function(table, tape, final, runtime)
{
	this.runtime_state = runtime
	this.table_transition = table
	this.idx_end_state = final
	this.tape = tape
}