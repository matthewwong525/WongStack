// The page's script. A relative URL, so the page works under any folder name.
const form = document.getElementById("form");
const message = document.getElementById("message");
form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const name = document.getElementById("name").value;
	const response = await fetch(`api/greeting?name=${encodeURIComponent(name)}`);
	message.textContent = response.ok ? (await response.json()).message : "Something went wrong. Try again.";
});
