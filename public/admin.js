"use strict"

document.addEventListener("DOMContentLoaded", () => {
  // Connect to WebSocket server
  const socketUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${
    location.host
  }/ws`
  console.log("socketUrl: ", socketUrl)
  const ws = new WebSocket(socketUrl)

  // Log WebSocket connection established
  ws.addEventListener("open", () => {
    console.log("WebSocket connection established")
    setInterval(() => {
      ws.send(new Date().toString())
    }, 1000)
  })

  // Log WebSocket error
  ws.addEventListener("error", (error) => {
    console.error("WebSocket error:", error)
  })

  // Log WebSocket connection closed
  ws.addEventListener("close", (event) => {
    console.log("WebSocket connection closed:", event.code, event.reason)
  })

  // Create RTC Peer connection
  const peer = new RTCPeerConnection()

  // Listen to track event
  const video = document.getElementById("client-screen")
  peer.addEventListener("track", (event) => {
    console.log("Received track:", event)
    video.srcObject = event.streams[0]
  })

  // Handle WebSocket messages
  ws.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data)
    console.log("admin message: ", message)

    switch (message.type) {
      case "offer":
        await handleOffer(message.data)
        break
      case "icecandidate":
        await handleIceCandidate(message.data)
        break
    }
  })

  async function handleOffer(sdp) {
    await peer.setRemoteDescription(new RTCSessionDescription(sdp))
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)

    ws.send(
      JSON.stringify({
        type: "answer",
        data: answer.sdp,
      })
    )
  }

  async function handleIceCandidate(candidate) {
    if (candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  // Handle local ICE candidates
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      ws.send(
        JSON.stringify({
          type: "icecandidate",
          data: event.candidate,
        })
      )
    }
  })
})
