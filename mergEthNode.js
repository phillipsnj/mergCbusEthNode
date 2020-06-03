
const net = require('net')
const jsonfile = require('jsonfile')
const mergCbus = require('./mergCbusNode')
const argv = require('minimist')(process.argv.slice(2))
//const mergCbus = require('../mergCbusNode/mergAdminNode.js')
//import {mergCbus, cbusMessage} from '../mergCbus'

class mergEthNode extends mergCbus.cbusNode {
    constructor(CONFIG_FILE, NET_ADDRESS, NET_PORT) {
        let setup = jsonfile.readFileSync(CONFIG_FILE)
        super(setup)
        this.config = setup
        this.configFile = CONFIG_FILE
        this.client = new net.Socket()
        this.client.connect(NET_PORT, NET_ADDRESS, function () {
            console.log('Client Connected');
        })
        //this.actions = super.actions

        this.client.on('data', function (data) {
            const outMsg = data.toString().split(";");
            for (var i = 0; i < outMsg.length - 1; i++) {
                let msg = new mergCbus.cbusMessage(outMsg[i]);
                //console.log(`Message : ${msg.opCode()} ${msg.nodeId()} ${msg.eventId()} ${msg.messageOutput()} ${msg.header()}`);
                this.action_message(msg)
               /*if (this.actions[msg.opCode()]) {
                    this.actions[msg.opCode()](msg);
                } else {
                    this.actions['DEFAULT'](msg);
                }*/
            }
        }.bind(this))

        if (argv.setup) {
            console.log(`Set TEACH_MODE = True`)
            //node.setTeachModeTrue()
            this.TEACH_MODE = true
            this.cbusSend(this.RQNN())
        } else {
            this.cbusSend(this.ASON(1))
        }
    }
    cbusSend(msg) {
        console.log(`cbusSend ${msg.toUpperCase()}`)
        this.client.write(msg.toUpperCase());
    }

    saveConfig() {
        this.config.events = this.events
        jsonfile.writeFileSync(this.configFile, this.config, {spaces: 2, EOL: '\r\n'})
    }
}

module.exports = {
    mergEthNode: mergEthNode
}


