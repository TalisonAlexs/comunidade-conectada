function toggleSenha(btn) {
    const input = btn.previousElementSibling;
    input.type = input.type === "password" ? "text" : "password";
}

function login() {
    alert("Login simulado.");
}

function cadastrar() {
    alert("Cadastro simulado.");
}

// Função auxiliar para retornar o ícone baseado na categoria
function getIconeCategoria(categoria) {
    switch (categoria) {
        case "Iluminação":
            return `<i class="fas fa-lightbulb" style="color: #f9c74f;"></i>`;
        case "Segurança":
            return `<i class="fas fa-shield-alt" style="color: #f94144;"></i>`;
        case "Transporte":
            return `<i class="fas fa-bus" style="color: #577590;"></i>`;
        default:
            return `<i class="fas fa-exclamation-circle" style="color: #adb5bd;"></i>`;
    }
}

function enviarDenuncia(e) {
    e.preventDefault();

    const titulo = document.getElementById("titulo").value;
    const descricao = document.getElementById("descricao").value;
    const rua = document.getElementById("rua").value;
    const numero = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value;
    const cidade = document.getElementById("cidade").value;
    const estado = document.getElementById("estado").value;
    const categoria = document.getElementById("categoria").value;
    const latitude = document.getElementById("latitude").value;
    const longitude = document.getElementById("longitude").value;
    const imagemInput = document.getElementById("imagem");
    const usuario = JSON.parse(localStorage.getItem("usuarioAtual")) || { nome: "Anônimo" };

    const enderecoCompleto = `${rua}, ${numero} - ${bairro}, ${cidade} - ${estado}`;

    // Ler imagem se houver
    if (imagemInput.files && imagemInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (event) {
            salvarDenuncia(event.target.result);
        };
        reader.readAsDataURL(imagemInput.files[0]);
    } else {
        salvarDenuncia(null);
    }

    function salvarDenuncia(imagemBase64) {
        const denuncia = {
            titulo,
            descricao,
            endereco: enderecoCompleto,
            bairro,
            categoria,
            latitude,
            longitude,
            imagem: imagemBase64,
            votos: 0,
            status: "Pendente",
            comentarios: [],
            nome: usuario.nome,
            data: new Date().toLocaleString()
        };

        const denuncias = JSON.parse(localStorage.getItem("denuncias") || "[]");
        denuncias.push(denuncia);
        localStorage.setItem("denuncias", JSON.stringify(denuncias));

        mostrarNotificacao();

        setTimeout(() => {
            window.location.href = "index.html";
        }, 3000);
    }
}

function coletarLocalizacao() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            position => {
                document.getElementById("latitude").value = position.coords.latitude;
                document.getElementById("longitude").value = position.coords.longitude;
            },
            error => {
                console.warn("Erro ao obter localização:", error.message);
            }
        );
    }
}

function filtrarDenuncias() {
    const bairro = document.getElementById("filtroBairro").value.toLowerCase();
    const container = document.getElementById("lista-denuncias");

    container.innerHTML = "";
    const denuncias = JSON.parse(localStorage.getItem("denuncias") || "[]");

    denuncias.forEach((d, i) => {
        if (bairro && !d.bairro.toLowerCase().includes(bairro)) return;

        const div = document.createElement("div");
        div.innerHTML = `
            <h3>${d.titulo}</h3>
            <p><strong>Descrição:</strong> ${d.descricao}</p>
            ${d.imagem ? `<img src="${d.imagem}" alt="Imagem da denúncia" style="max-width: 100%; margin: 10px 0;">` : ''}
            <p><strong>Endereço:</strong> ${d.endereco || "Não informado"}</p>
            <p><strong>Categoria:</strong> ${getIconeCategoria(d.categoria)} ${d.categoria}</p>
            <p><strong>Status:</strong>
                <select onchange="atualizarStatus(${i}, this.value)">
                    <option ${d.status === "Pendente" ? "selected" : ""}>Pendente</option>
                    <option ${d.status === "Em análise" ? "selected" : ""}>Em análise</option>
                    <option ${d.status === "Resolvido" ? "selected" : ""}>Resolvido</option>
                </select>
            </p>
            <p><strong>Votos:</strong> ${d.votos}
                <button onclick="votar(${i})">👍 Concordo</button>
            </p>
            <div>
                <h4>Comentários:</h4>
                <ul>${d.comentarios.map(c => `<li>${c}</li>`).join("")}</ul>
                <input type="text" id="coment-${i}" placeholder="Digite um comentário">
                <button onclick="comentar(${i})">Comentar</button>
            </div>
            <hr>
        `;
        container.appendChild(div);
    });
}

function votar(index) {
    const denuncias = JSON.parse(localStorage.getItem("denuncias") || "[]");
    denuncias[index].votos++;
    localStorage.setItem("denuncias", JSON.stringify(denuncias));
    filtrarDenuncias();
}

function comentar(index) {
    const input = document.getElementById(`coment-${index}`);
    const texto = input.value.trim();
    if (!texto) return;

    const denuncias = JSON.parse(localStorage.getItem("denuncias") || "[]");
    denuncias[index].comentarios.push(texto);
    localStorage.setItem("denuncias", JSON.stringify(denuncias));
    filtrarDenuncias();
}

function atualizarStatus(index, novoStatus) {
    const denuncias = JSON.parse(localStorage.getItem("denuncias") || "[]");
    denuncias[index].status = novoStatus;
    localStorage.setItem("denuncias", JSON.stringify(denuncias));
}

function fecharMapa(event) {
    const modal = document.getElementById("modalMapa");
    const conteudo = document.querySelector(".modal-conteudo");

    if (!conteudo.contains(event.target)) {
        modal.style.display = "none";
    }
}

async function mostrarMapa() {
    const modal = document.getElementById("modalMapa");
    modal.style.display = "flex";

    if (window._mapaLeaflet) {
        centralizarMapaNoEndereco();
        return;
    }

    const mapa = L.map('mapa').setView([-23.5505, -46.6333], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    let marcador;

    mapa.on('click', async function (e) {
        const { lat, lng } = e.latlng;

        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;

        if (marcador) {
            marcador.setLatLng(e.latlng);
        } else {
            marcador = L.marker(e.latlng).addTo(mapa);
        }

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await response.json();
            const endereco = data.address;

            if (endereco) {
                document.getElementById('rua').value = endereco.road || '';
                document.getElementById('bairro').value = endereco.suburb || endereco.neighbourhood || '';
                document.getElementById('cidade').value = endereco.city || endereco.town || endereco.village || '';
                document.getElementById('estado').value = endereco.state || '';
            }
        } catch (error) {
            console.error("Erro ao buscar endereço:", error);
        }

        document.getElementById("modalMapa").style.display = "none";
    });

    window._mapaLeaflet = mapa;
    window._marcadorLeaflet = marcador;

    centralizarMapaNoEndereco();
}

async function centralizarMapaNoEndereco() {
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;
    const bairro = document.getElementById('bairro').value;
    const cidade = document.getElementById('cidade').value;
    const estado = document.getElementById('estado').value;

    const query = encodeURIComponent(`${rua} ${numero}, ${bairro}, ${cidade}, ${estado}`);

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const resultados = await response.json();

        if (resultados.length > 0) {
            const lat = parseFloat(resultados[0].lat);
            const lon = parseFloat(resultados[0].lon);

            window._mapaLeaflet.setView([lat, lon], 16);

            if (window._marcadorLeaflet) {
                window._marcadorLeaflet.setLatLng([lat, lon]);
            } else {
                window._marcadorLeaflet = L.marker([lat, lon]).addTo(window._mapaLeaflet);
            }

            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lon;
        }
    } catch (error) {
        console.error("Erro ao centralizar mapa:", error);
    }
}

function mostrarNotificacao(mensagem = "Denúncia enviada com sucesso!") {
    const notif = document.getElementById("notificacao");
    notif.textContent = mensagem;
    notif.style.display = "block";

    setTimeout(() => {
        notif.style.display = "none";
    }, 3000);
}
