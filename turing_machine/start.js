var app_tape = new tape("#svg_tape")
var app_graph = new view_graph("#svg_graph")
var app_dlg = new dialog("#div_dialog")
var app_tm = new turing_machine()
msg.bind('msg_back_to_ready', app_dlg.on_back_to_ready, app_dlg)
msg.bind('msg_node_selected', app_dlg.on_node_selected, app_dlg)
msg.bind('msg_exit_node_selected', app_dlg.on_exit_node_selected, app_dlg)
msg.bind('msg_node_update', app_graph.on_node_update, app_graph)
msg.bind('msg_link_selected', app_dlg.on_link_selected, app_dlg)
msg.bind('msg_exit_link_selected', app_dlg.on_exit_link_selected, app_dlg)
msg.bind('msg_link_update', app_graph.on_link_update, app_graph)
msg.bind('msg_setting_tape', app_graph.on_setting_tape, app_graph)
msg.bind('msg_tape_set', app_graph.on_tape_set, app_graph)
msg.bind('msg_run_prepare', app_graph.on_run_prepare, app_graph)
msg.bind('msg_dlg_back_to_ready', app_graph.on_dlg_back_to_ready, app_graph)
msg.bind('msg_prepare_error', app_dlg.on_prepare_error, app_dlg)
msg.bind('msg_tm_compiled', app_tm.on_tm_compiled, app_tm)
msg.bind('msg_prepare_succeed', app_dlg.on_prepare_succeed, app_dlg)
msg.bind('msg_tape_init', app_tape.init, app_tape)
msg.bind('msg_fired_tape_info', app_tape.on_fired, app_tape)
msg.bind('msg_fired_node_info', app_dlg.on_fired_node_info, app_dlg)
msg.bind('msg_tape_finished', app_dlg.on_tape_finished, app_dlg)
msg.bind('msg_fire_tm', app_tm.on_fire_tm, app_tm)
msg.bind('msg_fire_tm_reverse', app_tm.on_fire_tm_reverse, app_tm)
msg.bind('msg_fired', app_graph.on_tm_fired, app_graph)
msg.bind('msg_link_delete', app_dlg.on_back_to_ready, app_dlg)
msg.bind('msg_save', app_graph.on_save, app_graph)
msg.bind('msg_model_required', app_graph.on_model_required, app_graph)

msg.emit('msg_back_to_ready')
app_graph.edit_update()
d3.select(window).on('keydown', function(){app_graph.keydown(d3.event)})

//test code
/*
var nodes = [
{x:100, y: 100, name:'q1', is_start:true, is_final:false},
{x:-100, y: 100, name:'q2', is_start:false, is_final:false},
{x:200, y: 200, name:'q3', is_start:false, is_final:false},
{x:300, y: 300, name:'q4', is_start:false, is_final:false},
];
var links = [
{source:nodes[0], target:nodes[0], transition:[[1, -1, 1]]},
{source:nodes[0], target:nodes[1], transition:[[0, 1, 1]]},
{source:nodes[1], target:nodes[0], transition:[[0, -1, 1]]},
{source:nodes[1], target:nodes[1], transition:[[1, 1, 1]]},
]
app_graph.links = links
app_graph.nodes = nodes
app_graph.start_node = nodes[0]
app_graph.final_node = nodes[3]
app_graph.tape = [0, 0, 0]
app_graph.edit_update()*/