const socket = io();

// Elements

const $sendPhoto = document.querySelector("#send-photo");
const $messageForm = document.querySelector("#message-form");
const $saveChat = document.querySelector("#save-chat");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild;

  // Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height
  const visibleHeight = $messages.offsetHeight;

  // Height of messages container
  const containerHeight = $messages.scrollHeight;

  // How far have I scrolled?
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (message) => {
  console.log(message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", (message) => {
  console.log(message);
  const html = Mustache.render(locationMessageTemplate, {
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users, numberOfUsers, totalUsers }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
    numberOfUsers,
    totalUsers,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  $messageFormButton.setAttribute("disabled", "disabled");

  const message = e.target.elements.message.value;

  socket.emit("sendMessage", message, (error) => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();

    if (error) {
      return console.log(error);
    }

    console.log("Message delivered!");
  });
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser.");
  }

  $sendLocationButton.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute("disabled");
        console.log("Location shared!");
      }
    );
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});

// Save chat in your device
document.addEventListener("DOMContentLoaded", function () {
  const saveChatButton = document.getElementById("save-chat");
  const messagesContainer = document.getElementById("messages");

  saveChatButton.addEventListener("click", () => {
    const messages = messagesContainer.querySelectorAll(".message");
    let chatContent = "";

    messages.forEach((message) => {
      const username = message.querySelector(".message__name").textContent;
      const createdAt = message.querySelector(".message__meta").textContent;

      // Check if the message contains text
      const textElement = message.querySelector(".save");
      if (textElement) {
        chatContent += `${username} (${createdAt}):\n${textElement.textContent}\n\n`;
      }

      // Check if the message contains a location link
      const locationLink = message.querySelector(".location-link");
      if (locationLink) {
        chatContent += `${username} (${createdAt}):\nLocation: ${locationLink.href}\n\n`;
      }

      // Check if the message contains a photo
      const imgElement = message.querySelector("img");
      if (imgElement) {
        chatContent += `${username} (${createdAt}):\n[Photo Attached]\n\n`;
      }
    });

    const blob = new Blob([chatContent], { type: "text/plain" });

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "chat.txt";
    link.click();
  });
});

//send Photo in the chat
$sendPhoto.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.click();

  input.addEventListener("change", () => {
    const file = input.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const photoData = e.target.result;
        socket.emit("sendPhoto", { photo: photoData }, (error) => {
          if (error) {
            console.error(error);
          } else {
            console.log("Photo sent!");
          }
        });
      };

      reader.readAsDataURL(file);
    }
  });
});

socket.on("photoMessage", (message) => {
  console.log(message);

  // Create an img element for the photo
  const img = document.createElement("img");
  img.src = message.photo;
  img.style.maxWidth = "500px";
  img.style.maxHeight = "500px";
  img.style.border = "5px solid #7c5cbf";
  img.style.borderRadius = "10px";

  // Create a div to contain the photo
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  messageDiv.innerHTML = `
    <p>
      <span class="message__name">${message.username}</span>
      <span class="message__meta">${moment(message.createdAt).format(
        "h:mm a"
      )}</span>
    </p>`;

  messageDiv.appendChild(img);

  document.querySelector("#messages").appendChild(messageDiv);

  autoscroll();
});
