# mergCbusEthNode
Example of how to create a Cbus Module using nodejs and the node package mergEthNode. This is an example of creating a simple module. When you teach an event it will just output the evant variable array to the console log.

Create a new directory and copy the files to the new directory and install required modules.

```npm install```

Edit the nodeConfig.json file with details of your node. The example is setup for a Flim module with 2 node variables and 2 event variables. Edit the main program file to set the NET_PORT and NET_ADDRESS to you cbus ethernet connection.

To run for the first time use the parameter --setup to emulate a module being put in Flim mode. This will enable the FCU to set it up.

```node mergCbusEthNode.js --setup```

Once you have the node setup in FCU you can run it using.

```mode mergCbusEthNode.js```

You can rename the main file from testMergEthNode.js to something more meaningfull.

