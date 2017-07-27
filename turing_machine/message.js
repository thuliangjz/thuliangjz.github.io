//a simple function to implement signals and slots
function message_object()
{
	this.messages = new Object
}
message_object.prototype.bind = function(name,foo, obj)
{
	if(this.messages[name] === undefined)
		this.messages[name] = new Array
	this.messages[name].push([foo, obj])
}
message_object.prototype.emit = function(name, ...args)
{
	if(this.messages[name])
	{
		for(var entry of this.messages[name])
		{
			entry[0].apply(entry[1], args)
		}
	}
}

var msg = new message_object()

function obj_injection(foo, obj)
{
	return function(...args)
	{
		foo.apply(obj, args)
	}
}