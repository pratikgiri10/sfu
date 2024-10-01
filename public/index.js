const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');
const mediasoupClient = require('mediasoup-client');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const start = document.getElementById('start');
const join = document.getElementById('join');

let device;
let sendTransport;
let recvTRansport;

start.addEventListener('click',async () => {
    // await initializeSocket();
    console.log('start button')
    await initializeDevice();
    setTimeout(function(){
        createSendTransport();

    },1000)
})
join.addEventListener('click',async () => {
    // await initializeSocket();
    console.log('join button')
    await initializeDevice();
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
        } catch(err){
            console.log("Error creating sendTransport: ",err);
        }
        
    })
}
async function createReceiveTransport(){

}