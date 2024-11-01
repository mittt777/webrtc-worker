"use strict"

function connectWebSocket() {
  const socketUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${
    location.host
  }/ws`
  console.log("Attempting to connect to:", socketUrl)

  const ws = new WebSocket(socketUrl)

  ws.addEventListener("open", () => {
    console.log("WebSocket connection established successfully")
  })

  ws.addEventListener("error", (error) => {
    console.error("WebSocket error:", error)
    if (ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket connection failed. ReadyState:", ws.readyState)
    }
  })

  ws.addEventListener("close", () => {
    console.log("WebSocket disconnected")
    // 可选：添加重连逻辑
    setTimeout(() => {
      console.log("Attempting to reconnect...")
      connectWebSocket()
    }, 5000)
  })

  return ws
}

document.addEventListener("DOMContentLoaded", () => {
  const ws = connectWebSocket()

  // Create RTC Peer connection object
  const peer = new RTCPeerConnection()

  // Handle need help button click event
  const helpButton = document.getElementById("need-help")
  helpButton.addEventListener("click", async () => {
    try {
      // Get screen share as a stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: true,
        // preferCurrentTab: true, // this option may only available on chrome
      })

      // add track to peer connection
      peer.addTrack(stream.getVideoTracks()[0], stream)

      // create a offer and send the offer to admin
      const sdp = await peer.createOffer()
      console.log("sdp: ", sdp)
      await peer.setLocalDescription(sdp)
      console.log("peer.localDescription: ", peer.localDescription)
      ws.send(JSON.stringify({ type: "offer", data: peer.localDescription }))
    } catch (error) {
      // Catch any exception
      console.error(error)
      alert(error.message)
    }
  })

  // listen to `answer` event
  ws.addEventListener("message", async (event) => {
    console.log("client received:", event.data)
    const data =
      typeof event.data === "string" ? JSON.parse(event.data) : event.data

    if (data.type === "answer") {
      await peer.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: data.data })
      )
    } else if (data.type === "icecandidate") {
      await peer.addIceCandidate(new RTCIceCandidate(data.data))
    }
  })

  /** Exchange ice candidate */
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // send the candidate to admin
      ws.send(JSON.stringify({ type: "icecandidate", data: event.candidate }))
    }
  })
})
