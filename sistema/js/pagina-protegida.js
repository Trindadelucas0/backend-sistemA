/**
 * Arquivo de página protegida (pagina-protegida.js)
 * Gerencia o acesso a páginas que requerem autenticação.
 * Este script verifica se o usuário está autenticado e carrega dados protegidos.
 * Também implementa a funcionalidade de logout.
 */

// Aguarda o DOM ser completamente carregado antes de executar o código
document.addEventListener("DOMContentLoaded", async () => {
  // Verifica se existe um token de autenticação no localStorage
  const token = localStorage.getItem("token");

  // Se não houver token, redireciona para a página de login
  if (!token) {
    alert("Você precisa estar logado para acessar esta página.");
    window.location.href = "login.html";
    return;
  }

  try {
    // Faz uma requisição para a API para verificar a autenticação e obter dados
    const response = await fetch(`${apiUrl}/listar-usuarios`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Inclui o token no cabeçalho de autorização
      },
    });

    // Verifica se a resposta foi bem-sucedida
    if (response.ok) {
      const data = await response.json();
      console.log("Usuários listados:", data.user);

      // Exibe os usuários na lista do DOM
      const listaUsuarios = document.getElementById("lista-usuarios");
      data.user.forEach((usuario) => {
        const li = document.createElement("li");
        li.textContent = `Nome: ${usuario.name}, Email: ${usuario.email}`;
        listaUsuarios.appendChild(li);
      });
    } else {
      // Tratamento de erro retornado pela API
      const error = await response.json();
      alert(`Erro ao acessar a página: ${error.message}`);
      window.location.href = "login.html"; // Redireciona para login em caso de erro
    }
  } catch (err) {
    // Tratamento de erros de rede ou outros erros não tratados
    console.error("Erro ao acessar a página protegida:", err);
    alert("Erro no servidor. Tente novamente mais tarde.");
    window.location.href = "login.html"; // Redireciona para login em caso de erro
  }
});

// Lógica para o botão de logout
document.getElementById("logout-button").addEventListener("click", () => {
  localStorage.removeItem("token"); // Remove o token do localStorage
  alert("Você foi desconectado.");
  window.location.href = "login.html"; // Redireciona para a página de login
});
