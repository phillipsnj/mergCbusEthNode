'use strict';

const EventEmitter = require('events').EventEmitter;

function pad(num, len) { //add zero's to ensure hex values have correct number of characters
    var padded = "00000000" + num;
    return padded.substr(-len);
}

class cbusNode extends EventEmitter {
    constructor(config) {
        super();
        this.nodeId = config.nodeId;
        this.TEACH_MODE = false
        //this.header = ':SBFA0N'
        this.pr1 = 2
        this.pr2 = 3
        this.canId = 60
        const outHeader = ((((this.pr1 * 4) + this.pr2) * 128) + this.canId) << 5
        this.header =  ':S'+outHeader.toString(16).toUpperCase()+'N'
        this.manufId = config.manufId;
        this.name = config.name;
        this.minorVersion = config.minorVersion;
        this.moduleId = config.moduleId;
        this.numEvents = config.numEvents;
        this.numEventVariables = config.numEventVariables;
        this.numSupportedNodeVariables = config.numSupportedNodeVariables;
        this.majorVersion = config.majorVersion;
        this.consumer = config.consumer;
        this.producer = config.producer;
        this.flim = config.flim;
        this.supportsBootloader = config.supportsBootloader;
        this.interface = config.interface;
        this.variables = config.variables;
        this.events = config.events;
        this.actions = {
            '90': (msg) => {
                console.log(`Accessory On: nodeId: ${msg.nodeId()} EventId: ${msg.eventId()}`);
                this.emitEvent('on',msg)
            },
            '91': (msg) => {
                console.log(`Accessory Off: nodeId: ${msg.nodeId()} EventId: ${msg.eventId()}`);
                this.emitEvent('off',msg)
            },
            '98': (msg) => {
                console.log(`Short Accessory On: nodeId: ${msg.nodeId()} EventId: ${msg.eventId()}`);
                this.emitShortEvent('on',msg)
            },
            '99': (msg) => {
                console.log(`Short Accessory Off: nodeId: ${msg.nodeId()} EventId: ${msg.eventId()}`);
                this.emitShortEvent('off',msg)
            },
            '0D': (msg) => {
                console.log('PNN :  ' + this.PNN());
                //this.emit('cbus', this.PNN());
                this.cbusSend(this.PNN())
            },
            '10': (msg) => {
                console.log(`OpCode 10 : ${this.TEACH_MODE ? 'TRUE' : 'FALSE'}`)
                console.log(`Test ${this.nodeId}`)
                if (this.TEACH_MODE) {
                    console.log(`PNN : ${this.PARAMS()}`)
                    this.cbusSend(this.PARAMS())
                }
            },
            '42': (msg) => {
                if (this.TEACH_MODE) {
                    console.log('NNACK :  ' + this.NNACK());
                    this.nodeId = msg.nodeId()
                    config.nodeId = msg.nodeId()
                    this.cbusSend(this.NNACK())
                    this.TEACH_MODE = false
                    this.saveConfig()
                }
            },
            '53': (msg) => {
                console.log('NNLRN :  ' + msg.nodeId());
                if (msg.nodeId() == this.nodeId) {
                    this.TEACH_MODE = true
                    this.saveConfig()
                }
            },
            '54': (msg) => {
                console.log('NNULN :  ' + msg.nodeId());
                if (msg.nodeId() == this.nodeId) {
                    this.TEACH_MODE = false
                    this.saveConfig()
                }
            },
            '55': (msg) => {
                console.log('NNCLR :  ' + msg.nodeId());
                if (msg.nodeId() == this.nodeId && this.TEACH_MODE) {
                    this.events = {}
                    this.saveConfig()
                }
            },
            '57': (msg) => {
                console.log('NERD :  ' + msg.nodeId());
                if (msg.nodeId() == this.nodeId) {
                    this.cbusSend(this.ENRSP())
                }
            },
            '58': (msg) => {
                console.log('RQEVN :  ' + msg.nodeId());
                if (msg.nodeId() == this.nodeId) {
                    this.cbusSend(this.NUMEV())
                }
            },
            'D2': (msg) => {
                console.log('EVLRN :  ' + msg.messageOutput())
                if (this.TEACH_MODE) {
                    this.teachEvent(msg.nodeId(), msg.eventId(), msg.getInt(17,2), msg.getInt(19,2));
                    this.saveConfig()
                }
            },
            '11': (msg) => {
                console.log('NAME :  ' + this.NAME());
                if (this.TEACH_MODE) {
                    this.cbusSend(this.NAME())
                }
            },
            '71': (msg) => {
                if (msg.nodeId() == this.nodeId) {
                    //console.log('NVANS Output:  ' + msg.index() + ' ' + this.NVANS(msg.index()));
                    if (!this.variables[msg.index()]) {
                        this.variables[msg.index()] = 0
                    }
                    console.log(`Variable ${msg.index()} = ${this.variables[msg.index()]}`)
                    this.emit('cbus', this.NVANS(msg.index()));
                    this.cbusSend(this.NVANS(msg.index()))
                    this.saveConfig()
                }
            },
            '96': (msg) => {
                console.log('NVSET :  ');
                this.variables[msg.index()] = msg.value()
                this.cbusSend(this.WRACK())
                this.saveConfig()
            },
            '9C': (msg) => {
                console.log(`REVAL : ${msg.messageOutput()} - ${msg.nodeId()} , ${msg.getInt(13,2)} , ${msg.getInt(15,2)}`);
                if (msg.nodeId() == this.nodeId) {
                    this.emit('cbus', this.NEVAL(msg.getInt(13,2), msg.getInt(15,2)))
                    this.cbusSend(this.NEVAL(msg.getInt(13,2), msg.getInt(15,2)))
                }

            },
            '73': (msg) => {
                if (msg.nodeId() == this.nodeId) {
                    console.log('PARAN Output:  ' + msg.index() + ' ' + this.PARAN(msg.index()));
                    this.emit('cbus', this.PARAN(msg.index()))
                    this.cbusSend(this.PARAN(msg.index()))
                }
            },
            'DEFAULT': (msg) => {
                //console.log("Opcode " + msg.opCode() + ' is not supported by this module');
            }
        }
    }

    action_message(msg){
        if (this.actions[msg.opCode()]) {
            this.actions[msg.opCode()](msg);
        } else {
            this.actions['DEFAULT'](msg);
        }
    }

    emitEvent(type,msg){
        //console.log(`Emit Event ${type} : ${msg}`)
        if (this.events[msg.eventIndex()]) {
            const len = this.events[msg.eventIndex()].length
            let variables = []
            for (let i = 1; i < len; i++) {
                //this.emit('task', {'type': type, 'variable': i, 'value': this.events[msg.eventIndex()][i]})
                variables[i] = this.events[msg.eventIndex()][i]
            }
            this.emit('event',{'type': type, 'variable':variables})
        }
    }

    emitShortEvent(type,msg){
        //console.log(`Emit Event ${type} : ${msg}`)
        if (this.events[msg.eventShortIndex()]) {
            const len = this.events[msg.eventShortIndex()].length
            let variables = []
            for (let i = 1; i < len; i++) {
                //this.emit('task', {'type': type, 'variable': i, 'value': this.events[msg.eventIndex()][i]})
                variables[i] = this.events[msg.eventShortIndex()][i]
            }
            this.emit('event',{'type': type, 'variable':variables})
        }
    }

    cbusSend(msg) {
        console.log(`cbusSend Base : ${msg.toUpperCase()}`)
        this.emit('cbus', msg.toUpperCase());
    }

    saveConfig(){
        console.log(`saveConfig method not implemented`)
        this.emit('save');
    }

    flags() {
        let output = 0;
        if (this.consumer) output += 1;
        if (this.producer) output += 2;
        if (this.flim) output += 4;
        if (this.supportsBootloader) output += 8;
        return output;
    }

    params() {
        let par = []
        par[1] = pad(this.manufId.toString(16), 2)
        par[2] = pad(this.minorVersion.charCodeAt(0).toString(16), 2) // is a Character
        par[3] = pad(this.moduleId.toString(16), 2)
        par[4] = pad(this.numEvents.toString(16), 2)
        par[5] = pad(this.numEventVariables.toString(16), 2)
        par[6] = pad(this.numSupportedNodeVariables.toString(16), 2)
        par[7] = pad(this.majorVersion.toString(16), 2)
        par[8] = pad(this.flags().toString(16), 2)
        par[9] = "00" //Processor Id
        par[10] = pad(this.interface.toString(16), 2)
        par[11] = "00" //Load Address 1
        par[12] = "00" //Load Address 2
        par[13] = "00" //Load Address 3
        par[14] = "00" //Load Address 4
        par[15] = "00" //Manufacturers Processor Code 1
        par[16] = "00" //Manufacturers Processor Code 2
        par[17] = "00" //Manufacturers Processor Code 3
        par[18] = "00" //Manufacturers Processor Code 4
        par[19] = pad(this.manufId.toString(16), 2)
        par[20] = "01" //Beta Release Code
        par[0] = par.length - 1
        return par
    }

    /*header() {
        const outHeader = ((((this.pr1 * 4) + this.pr2) * 128) + this.canId) << 5
        return ':S'+outHeader.toString(16).toUpperCase()+'N'
    }*/

    eventExists(nodeId, eventId) { //needs improvement return events
        var event = this.events.filter(function (item) {
            return (item.nodeId == nodeId && item.eventId == eventId);
        });
        if (event.length > 0) {
            //console.log('Node Id :' + event[0].nodeId + ' Event Id : ' + event[0].eventId+' is Active');
            return true;
        } else {
            //console.log('Event is Unkown');
            return false;
        }
    }

    teachEvent(nodeId, eventId, action, value) {
        const eventIndex = (pad(nodeId.toString(16), 4) + pad(eventId.toString(16), 4)).toUpperCase()
        if (!this.events[eventIndex]) {
            this.events[eventIndex] = []
            for (let i=1; i<= this.numEventVariables; i++){
                this.events[eventIndex][i] = 0
            }
        }
        this.events[eventIndex][action] = value
    }

    QNN() {
        return this.header + '0D' + ';';
    }

    PNN() {
        return this.header + 'B6' + pad(this.nodeId.toString(16), 4) + pad(this.manufId.toString(16), 2) + pad(this.moduleId.toString(16), 2) + pad(this.flags(16), 2) + ';';
    }

    PARAMS() {
        var par = this.params();
        //console.log('RQNPN :'+par[index]);
        let output = this.header + 'EF'
        for (var i = 1; i < 8; i++) {
            output += par[i]
        }
        output += ';'
        return output;

    }

    RQNN() {
        console.log(`RQNN TM : ${this.TEACH_MODE ? 'TRUE' : 'FALSE'}`)
        return this.header + '50' + pad(this.nodeId.toString(16), 4) + ';';
    }

    NNACK() {
        return this.header + '52' + pad(this.nodeId.toString(16), 4) + ';';
    }

    WRACK() {
        return this.header + '59' + pad(this.nodeId.toString(16), 4) + ';';
    }

    NUMEV() {
        return this.header + '74' + pad(this.nodeId.toString(16), 4) + pad(Object.keys(this.events).length.toString(16), 2) + ';';
        //object.keys(this.events).length
    }

    NEVAL(eventIndex, eventNo) {
        const eventId = Object.keys(this.events)[eventIndex-1]
        console.log(`NEVAL ${eventId} : ${eventIndex} : ${eventNo} -- ${Object.keys(this.events)}`)
        return this.header + 'B5' + pad(this.nodeId.toString(16), 4) + pad(eventIndex.toString(16), 2) + pad(eventNo.toString(16), 2)+ pad(this.events[eventId][eventNo].toString(16), 2) + ';'
    }

    ENRSP() {
        let output = '';
        console.log(`ENRSP : ${Object.keys(this.events).length}`);
        const eventList = Object.keys(this.events)
        for (let i = 0, len = eventList.length; i < len; i++) {
            output += this.header + 'F2' + pad(this.nodeId.toString(16), 4) + eventList[i] + pad((i+1).toString(16), 2) + ';'
            console.log(`ENSRP output : ${output}`)
        }
        return output
    }

    PARAN(index) {
        const par = this.params();
        //console.log('RQNPN :'+par[index]);
        return this.header + '9B' + pad(this.nodeId.toString(16), 4) + pad(index.toString(16), 2) + pad(par[index].toString(16), 2) + ';';
    }

    NVANS(index) {
        return this.header + '97' + pad(this.nodeId.toString(16), 4) + pad(index.toString(16), 2) + pad(this.variables[index].toString(16), 2) + ';';
    }

    NAME() {
        let name = this.name + '       '
        let output = ''
        for (let i = 0; i < 7; i++) {
            output = output + pad(name.charCodeAt(i).toString(16), 2)
        }
        return this.header + 'E2' + output + ';'
    }

    ACON(event) {
        return this.header + '90' + pad(this.nodeId.toString(16), 4) + pad(event.toString(16), 4) + ';';
    }

    ACOF(event) {
        return this.header + '91' + pad(this.nodeId.toString(16), 4) + pad(event.toString(16), 4) + ';';
    }
    ASON(event) {
        return this.header + '98' + pad(this.nodeId.toString(16), 4) + pad(event.toString(16), 4) + ';';
    }

    ASOF(event) {
        return this.header + '99' + pad(this.nodeId.toString(16), 4) + pad(event.toString(16), 4) + ';';
    }
};

class cbusMessage {
    constructor(msg) {
        this.message = msg.toString();
        /*        this.header = parseInt(this.message.substr(0,7),16)
                this.prority1 = this.header >>>14
                this.prority2 = this.header >>>12 & 3;
                this.canId = header >>>5 & 31
                this.type = this.message.substr(6,1)*/
    }

    header() {
        const header = parseInt(this.message.substr(2, 4), 16)
        const priority1 = header >>> 14
        const priority2 = header >>> 12 & 3;
        const canId = header >>> 5 & 31
        const type = this.message.substr(6, 1)
        const outHeader = ((((priority1 * 4) + priority2) * 128) + canId) << 5
        //return `Pr1:${priority1} Pr2:${priority2} CanId:${canId} Type:${type} Header:${header} outHeader:${outHeader}`
        return `:S${outHeader.toString(16).toUpperCase()}N`
    }

    deCodeCbusMsg() {
        const event = this.message;
        const header = parseInt(event.substr(2, 4), 16);
        const pr1 = header >>> 14;
        const pr2 = header >>> 12 & 3;
        const canNodeId = header >>> 5 & 31;
        const type = event.substr(6, 1);
        const opCode = event.substr(7, 2);
        const nodeId = parseInt(event.substr(9, 4), 16);
        const eventId = event.substr(13, 4);
        return ` PR1:${pr1} PR2:${pr2} CanId:${canNodeId} type:${type} opCode:${opCode} Cbus NodeId:${nodeId} Event Id:${eventId}`;
    }

    opCode() {
        return this.message.substr(7, 2);
    }

    nodeId() {
        return parseInt(this.message.substr(9, 4), 16);
    }

    eventId() {
        return parseInt(this.message.substr(13, 4), 16);
    }

    eventNo() {
        return parseInt(this.message.substr(17, 2), 16);
    }

    eventValue() {
        return parseInt(this.message.substr(15, 2), 16);
    }

    eventIndex() {
        return this.message.substr(9, 8)

    }

    eventShortIndex() {
        return '0000'+this.message.substr(13, 4)

    }

    eventVariableIndex() {
        return parseInt(this.message.substr(13, 2), 16);
        //return this.message.substr(13, 2)
    }

    getInt(start, length){
        return parseInt(this.message.substr(start, length), 16);
    }

    getChar(start,length){
        return this.message.substr(start, length)
    }

    index() {
        return parseInt(this.message.substr(13, 2), 16);
    }

    value() {
        return parseInt(this.message.substr(15, 2), 16);
    }

    data() {
        var data = [];
        var dataStr = this.message.substr(7, this.message.length - 7);
        for (var i = 0; i < dataStr.length - 1; i += 2)
            data.push(dataStr.substr(i, 2));
        return data;
    }

    messageOutput() {
        return this.message
    }
}

module.exports = {
    cbusNode: cbusNode,
    cbusMessage: cbusMessage
}


