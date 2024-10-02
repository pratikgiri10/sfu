const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');
const mediasoupClient = require('mediasoup-client');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const start = document.getElementById('start');
const join = document.getElementById('join');

let device;
let sendTransport;
let recvTransport;
let producer;
let consumer;

start.addEventListener('click',async () => {
    // await initializeSocket();
    console.log('start button')
    await initializeDevice();
    setTimeout(function(){
        createSendTransport();

    },500);
    
})
join.addEventListener('click',async () => {
    // await initializeSocket();
    console.log('join button')
    await initializeDevice();
    setTimeout(function(){
        createRecvTransport();

    },500)
})




    socket.on('connect', () => {
        console.log(`A client connected: ${socket.id}`);
    })
async function initializeDevice(){
    console.log("Initializing device");
    socket.emit('getRtpCapabilities',{},async (rtpCapabilities) => {
        console.log('getting rtpCapabilities: ',rtpCapabilities)
        const routerRtpCapabilities = rtpCapabilities;
        device = new mediasoupClient.Device();
        await device.load({routerRtpCapabilities});
        console.log('Device loaded with rtpCapabilities: ',device.rtpCapabilities);

    })
}
async function createSendTransport(){
    if(!device)
        console.log("Device not initialized");
    socket.emit('createSendTransport',device.rtpCapabilities,async (params) => {
        console.log("Params from send tranport: ",params);
        try{
            sendTransport = await device.createSendTransport(params);
            
            sendTransport.on('connect',async ({dtlsParameters},callback,errback) => {
                try{
                    console.log("producer connect event")
                    socket.emit('producer-connect',{
                        id: sendTransport.id,
                        dtlsParameters
                    })
                    callback();
                } catch(err){
                    console.log("Error emitting produce-connect: ",err);
                    errback(err);
                }
            })
            sendTransport.on('produce',async (parameters,callback,errback) => {
                try{
                    console.log('produce event')
                    const { id } = socket.emit('produce',{
                        id: sendTransport.id,
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters
                    }) 
                    callback({id});
                } catch(err){
                    errback(err);
                }
            })
            sendTransport.on('icestatechange',(state) => {
                console.log("IceStateChange: ",state);
            })
            sendTransport.on('connectionstatechange',(state) => {
                console.log("ConnectionStateChange: ",state);
            })
            await produceMedia();
        } catch(err){
            console.log("Error creating sendTransport: ",err);
        }
        
    })
    
}
async function produceMedia(){
    console.log("producing media")
    const stream = await navigator.mediaDevices.getUserMedia({video: true});
    localVideo.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    try{
        console.log('before producing')
        producer = await sendTransport.produce({track});
        console.log("produced media")
    } catch(err){
        console.log("error in producing media: ",err);
    }
    
    
}

async function createRecvTransport(){
    if(!device)
        console.log("Device not initialized");
    socket.emit('createRecvTransport',device.rtpCapabilities,async (params) => {
        
        try{
            recvTransport = await device.createRecvTransport(params);
            console.log("recv transport created: ",params);
            recvTransport.on('connect',async ({dtlsParameters},callback,errback) => {
                try{
                    console.log('consumer connect');
                    socket.emit('consumer-connect',{                        
                        dtlsParameters
                    })
                    callback();
                } catch(err){
                    console.log("Error emitting consumer-connect: ",err);
                    errback(err);
                }
            })
           
            recvTransport.on('connectionstatechange',(state) => {
                console.log("Consumer ConnectionStateChange: ",state);
            })
            console.log("calling consume")
            await consume();
        } catch(err){
            console.log("error in recv transport: ",err);
        }
    })
    
}
async function consume(){
    console.log("consume...");
        socket.emit('consume',{rtpCapabilities: device.rtpCapabilities},async (params) => {
            try{
                console.log("before consuming")
                consumer = await recvTransport.consume({
                    id: params.id,
                    producerId: params.producerId,
                    kind: params.kind,
                    rtpParameters: params.rtpParameters
                });
                console.log('track')
                // Render the remote video track into a HTML video element.
                const { track } = consumer;

                remoteVideo.srcObject = new MediaStream([ track ]);
                socket.emit('resume');
            } catch(err){
                console.log("error consuming: ",err);
            }
        })
        
    
}