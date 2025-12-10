export async function login(email, password) {
    const formData = new FormData();
    formData.append("eMail", email);
    formData.append("password", password);

    const res = await fetch("http://localhost:5000/loginSecure.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password })
    });
    const text = await res.text();
    console.log("Raw response:", text);

    // Then parse only if it looks like JSON
    try {
        const data = JSON.parse(text);
        console.log(data);
    } catch (err) {
        console.error("Failed to parse JSON:", err);
    }
}

// Example usage
//login("traianosg@idika.gr", "hweZ8AzkCNPc*");
