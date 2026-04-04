// --- 1. CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://ffmespckhcnwdibcytwd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hQt5pZayzzVvWoroX0A2qg_-oFCFUWD';

// Variable global para el cliente
let _supabase = null;

// Esta es la función que te faltaba o que daba error
function getSupabase() {
    if (typeof supabase === 'undefined') {
        console.error("La librería de Supabase no se ha cargado. Revisa el index.html.");
        return null;
    }
    if (!_supabase) {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _supabase;
}

// --- 2. VARIABLES DE ESTADO ---
let idActual = localStorage.getItem('id_actual') || null;
const editor = document.getElementById('editor');
const titleInput = document.getElementById('title');
const listaContenedor = document.getElementById('lista-poemas');
const metricSidebar = document.getElementById('metric-sidebar');

// --- 3. INICIALIZACIÓN ---
window.onload = async () => {
    console.log("Iniciando PoetStudio...");
    await cargarBiblioteca();
    if (idActual) {
        cargarPoemaLocal(idActual);
    }
};

// --- 4. GESTIÓN DE LA BIBLIOTECA ---

async function cargarBiblioteca() {
    const client = getSupabase();
    if (!client) return;

    const { data, error } = await client
        .from('poemas')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error) renderBiblioteca(data);
}

async function nuevoPoema() {
    const client = getSupabase();
    if (!client) return;

    console.log("Creando nuevo poema en la nube...");
    const { data, error } = await client
        .from('poemas')
        .insert([{ titulo: "Sin título", contenido: "" }])
        .select();

    if (data && data.length > 0) {
        idActual = data[0].id;
        localStorage.setItem('id_actual', idActual);
        await cargarBiblioteca();
        cargarPoemaLocal(idActual);
    }
}

async function cargarPoemaLocal(id) {
    const client = getSupabase();
    idActual = id;
    localStorage.setItem('id_actual', id);
    
    const { data } = await client.from('poemas').select('*').eq('id', id).single();

    if (data) {
        titleInput.value = data.titulo || "";
        editor.value = data.contenido || "";
        renderActivoEnLista(id);
        processPoem();
    }
}

function renderBiblioteca(poemas) {
    if (!listaContenedor) return;
    listaContenedor.innerHTML = '';
    poemas.forEach(p => {
        const div = document.createElement('div');
        div.className = `item-poema ${p.id == idActual ? 'activo' : ''}`;
        div.id = `item-${p.id}`;
        div.innerText = p.titulo || "Sin título";
        div.onclick = () => cargarPoemaLocal(p.id);
        listaContenedor.appendChild(div);
    });
}

function renderActivoEnLista(id) {
    document.querySelectorAll('.item-poema').forEach(el => el.classList.remove('activo'));
    const activo = document.getElementById(`item-${id}`);
    if (activo) activo.classList.add('activo');
}

// --- 5. GUARDADO Y MÉTRICA ---

let timeoutGuardado;
async function guardarEnNube() {
    const client = getSupabase();
    if (!idActual || !client) return;
    
    await client.from('poemas').update({
        titulo: titleInput.value,
        contenido: editor.value
    }).eq('id', idActual);

    const itemLista = document.getElementById(`item-${idActual}`);
    if (itemLista) itemLista.innerText = titleInput.value || "Sin título";
}

function processPoem() {
    const lines = editor.value.split('\n');
    metricSidebar.innerHTML = '';
    lines.forEach(line => {
        const count = calculateMetric(line);
        const div = document.createElement('div');
        div.className = 'metric-line';
        div.innerText = (line.trim() === '') ? '' : count;
        metricSidebar.appendChild(div);
    });
    clearTimeout(timeoutGuardado);
    timeoutGuardado = setTimeout(guardarEnNube, 1000);
}

// --- 6. LÓGICA MÉTRICA ---
function calculateMetric(text) {
    if (!text.trim()) return 0;
    let phrase = text.toLowerCase().replace(/[-.,!?;:]/g, '').trim();
    phrase = phrase.replace(/([aeiouáéíóúü])\s+([aeiouáéíóúüh])/g, '$1$2');
    const syllableRegex = /[aeiouáéíóúü]+([^aeiouáéíóúü]|(?=[aeiouáéíóúü]))*/g;
    const matches = phrase.match(syllableRegex);
    let total = matches ? matches.length : 0;
    const words = text.trim().split(/\s+/);
    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?;:]/g, '');
    total += getAccentModifier(lastWord);
    return total;
}

function getAccentModifier(word) {
    const vocals = "aeiouáéíóú", accents = "áéíóú", lastChar = word.slice(-1);
    const tildeMatch = word.match(/[áéíóú]/);
    if (tildeMatch) {
        const tildePos = word.indexOf(tildeMatch[0]);
        if (tildePos < word.length - 4) return -1;
    }
    const isAgudaConTilde = accents.includes(lastChar);
    const isAgudaSinTilde = !"ns".includes(lastChar) && !vocals.includes(lastChar);
    if (isAgudaConTilde || (isAgudaSinTilde && !word.match(/[áéíóú]/))) return 1;
    return 0;
}

// --- 7. EVENTOS ---
editor.addEventListener('input', processPoem);
titleInput.addEventListener('input', processPoem);