'use strict';

const pcCbus = require('./mergEthNode')

const file = './nodeConfig.json'

const NET_PORT = 5550;
const NET_ADDRESS = "192.168.8.123";

let node = new pcCbus.mergEthNode(file, NET_ADDRESS, NET_PORT);

console.log('New Node :' + node.nodeId)
console.log('New Name :' + node.name)
//console.log('Action 2 :'+node.actions['90'])
//console.log(`New Actions :${JSON.stringify(node.actions)}`)

const argv = require('minimist')(process.argv.slice(2))

node.on('event', function (task) {
    console.log(`Event :${JSON.stringify(task)} :: ${task.type} :: ${task.variable[1]}`)
    for (let i = 1; i < task.variable.length; i++) {
        if (task.variable[i] != 0) {
            if (task.type == "on") {
                node.cbusSend(node.ASON(task.variable[i]))
                console.log(`Send Event On  ${task.variable[i]}`)
            } else {
                node.cbusSend(node.ASOF(task.variable[i]))
                console.log(`Send Event Off  ${task.variable[i]}`)
            }
        }
    }
})

if (argv.setup) {
    console.log(`Set TEACH_MODE = True`)
    //node.setTeachModeTrue()
    node.TEACH_MODE = true
    node.cbusSend(node.RQNN())
} else {
    node.cbusSend(node.ASON(1))
}


