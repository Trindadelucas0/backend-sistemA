document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch("apiUrl/listar-usuarios", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Usuários listados:", data.user);

      // Exibe os usuários na lista
      const listaUsuarios = document.getElementById("lista-usuarios");
      data.user.forEach((usuario) => {
        const li = document.createElement("li");
        li.textContent = `Nome: ${usuario.name}, Email: ${usuario.email}`;
        listaUsuarios.appendChild(li);
      });
    } else {
      const error = await response.json();
      alert(`Erro ao acessar a página: ${error.message}`);
      window.location.href = "login.html";
    }
  } catch (err) {
    console.error("Erro ao acessar a página protegida:", err);
    alert("Erro no servidor. Tente novamente mais tarde.");
    window.location.href = "login.html";
  }
});

// Lógica para o botão de logout
document.getElementById("logout-button").addEventListener("click", () => {
  localStorage.removeItem("token"); // Remove o token do localStorage
  alert("Você foi desconectado.");
  window.location.href = "login.html"; // Redireciona para a página de login
});
