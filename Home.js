const statusDiv = document.getElementById("network-status"); 
function updateNetworkStatus() { 
if (navigator.onLine) { 
statusDiv.textContent = "✅ You are back online!"; 
statusDiv.className = "online"; 
statusDiv.style.display = "block"; 
// Hide after 3 seconds 
setTimeout(() => { 
statusDiv.style.display = "none"; 
}, 3000); 
} else { 
statusDiv.textContent = "⚠️ You are offline. Check your internet."; 
statusDiv.className = "offline"; 
statusDiv.style.display = "block"; 
} 
} 
// Listen for network changes 
window.addEventListener("online", updateNetworkStatus); 
window.addEventListener("offline", updateNetworkStatus); 
// Run once on page load 
updateNetworkStatus(); 



const AdminButton = document.getElementById("AdminLogin");

document.addEventListener("keydown", (e) => {
    if(e.ctrlKey && e.shiftKey && e.key.toLocaleLowerCase() ==='k'){
        AdminButton.classList.toggle("hidden");
    }
});












