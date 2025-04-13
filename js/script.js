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
    const usuario = JSON.parse(localStorage.getItem("usuarioAtual")) || { nome: "Anônimo" };

    const enderecoCompleto = `${rua}, ${numero} - ${bairro}, ${cidade} - ${estado}`;

    const denuncia = {
        titulo,
        descricao,
        endereco: enderecoCompleto,
        bairro,
        categoria,
        latitude,
        longitude,
        votos: 0,
        status: "Pendente",
        comentarios: [],
        nome: usuario.nome,
        data: new Date().toLocaleString()
    };

    const denuncias = JSON.parse(localStorage.getItem("denuncias") || "[]");
    denuncias.push(denuncia);
    localStorage.setItem("denuncias", JSON.stringify(denuncias));
    alert("Denúncia enviada com sucesso!");
    window.location.href = "index.html";
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
    const inicio = new Date(document.getElementById("dataInicial").value);
    const fim = new Date(document.getElementById("dataFinal").value);
    const container = document.getElementById("lista-denuncias");

    container.innerHTML = "";
    const denuncias = JSON.parse(localStorage.getItem("denuncias") || "[]");

    denuncias.forEach((d, i) => {
        if (bairro && !d.bairro.toLowerCase().includes(bairro)) return;

        const div = document.createElement("div");
        div.innerHTML = `
            <h3>${d.titulo}</h3>
            <p><strong>Descrição:</strong> ${d.descricao}</p>
            <p><strong>Endereço:</strong> ${d.endereco || "Não informado"}</p>
            <p><strong>Categoria:</strong> ${d.categoria}</p>
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

async function buscarEndereco() {
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;
    const bairro = document.getElementById('bairro').value;
    const cidade = document.getElementById('cidade').value;
    const estado = document.getElementById('estado').value;

    if (!rua || !numero || !bairro || !cidade || !estado) {
        alert("Preencha todos os campos do endereço.");
        return;
    }

    const query = encodeURIComponent(`${rua} ${numero}, ${bairro}, ${cidade}, ${estado}`);

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const resultados = await response.json();

        if (resultados.length > 0) {
            const lat = parseFloat(resultados[0].lat);
            const lon = parseFloat(resultados[0].lon);

            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lon;

            const mapa = window._mapaLeaflet;
            const marcador = window._marcadorLeaflet;

            mapa.setView([lat, lon], 17);

            if (marcador) {
                marcador.setLatLng([lat, lon]);
            } else {
                window._marcadorLeaflet = L.marker([lat, lon]).addTo(mapa);
            }
        } else {
            alert('Endereço não encontrado.');
        }
    } catch (error) {
        alert("Erro ao buscar o endereço. Tente novamente.");
        console.error(error);
    }
}

let mapaIniciado = false;

async function mostrarMapa() {
    const modal = document.getElementById("modalMapa");
    modal.style.display = "flex";

    // Se o mapa já foi iniciado, só mostrar novamente
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
    });

    window._mapaLeaflet = mapa;
    window._marcadorLeaflet = marcador;

    centralizarMapaNoEndereco();
}


function fecharMapa(event) {
    const modal = document.getElementById("modalMapa");
    const conteudo = document.querySelector(".modal-conteudo");

    if (!conteudo.contains(event.target)) {
        modal.style.display = "none";
    }
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

function inicializarMapaDenuncia() {
    const mapa = L.map('mapa').setView([-23.5505, -46.6333], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    let marcador;

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            mapa.setView([latitude, longitude], 15);
        });
    }

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
            } else {
                alert("Não foi possível obter o endereço.");
            }
        } catch (error) {
            console.error("Erro ao buscar endereço:", error);
        }

        document.getElementById("modalMapa").style.display = "none";
    });

    window._mapaLeaflet = mapa;
    window._marcadorLeaflet = marcador;
}
