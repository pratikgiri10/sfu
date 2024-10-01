const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');
const mediasoupClient = require('mediasoup-client');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const start = document.getElementById('start');
const join = document.getElementById('join');

let device;

start.addEventListener('click',async () => {
    // await initializeSocket();
    console.log('start button')
    await initializeDevice();
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

}
async function createReceiveTransport(){

}