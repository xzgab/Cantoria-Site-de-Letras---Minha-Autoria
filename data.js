/* ==========================================================================
   Cantoria — Catálogo base de músicas
   Letras de domínio público / composições tradicionais brasileiras.
   ========================================================================== */

const GENRES = [
  { id: "mpb", name: "MPB" },
  { id: "rock", name: "Rock" },
  { id: "sertanejo", name: "Sertanejo" },
  { id: "samba", name: "Samba" },
  { id: "forro", name: "Forró" },
  { id: "pop", name: "Pop" },
  { id: "blues", name: "Blues" },
  { id: "gospel", name: "Gospel" },
  { id: "folclore", name: "Folclore" },
  { id: "bossa", name: "Bossa Nova" }
];

/* Cores de capa geradas por gradiente quando não há imagem */
const COVER_GRADIENTS = [
  ["#b06cff", "#ff6c9f"],
  ["#5b8cff", "#b06cff"],
  ["#2fd4a4", "#5b8cff"],
  ["#ff8a5b", "#ff4d8d"],
  ["#ffc861", "#ff6c47"],
  ["#7d5bff", "#2fd4a4"],
  ["#ff6c9f", "#ffc861"],
  ["#3ddc97", "#1e9cff"]
];

/* Catálogo inicial embutido no site */
const SONGS = [
  {
    id: "aquarela",
    title: "Aquarela",
    artist: "Toquinho",
    genre: "mpb",
    year: 1983,
    views: 1520,
    featured: true,
    createdAt: "2024-01-10",
    lyrics: `Numa folha qualquer eu desenho um sol amarelo
E com cinco ou seis retas é fácil fazer um castelo
Corro o lápis em torno da mão e me dou uma luva
E se faço chover com dois riscos tenho um guarda-chuva

Se um pinguinho de tinta cai num pedacinho azul do papel
Num instante imagino uma linda gaivota a voar no céu
Vai voando contornando a imensa curva norte sul
Vou com ela viajando Havaí, Pequim ou Istambul
Pinto um barco à vela branco navegando
É tanto céu e mar num beijo azul

Entre as nuvens vem surgindo um lindo avião rosa e grená
Tudo em volta colorindo com suas luzes a piscar
Basta imaginar e ele está partindo sereno e lindo
E se a gente quiser ele vai pousar

Numa folha qualquer eu desenho um navio de partida
Com alguns bons amigos bebendo de bem com a vida
De uma América a outra eu consigo passar num segundo
Giro um simples compasso e num círculo eu faço o mundo

Um menino caminha e caminhando chega no muro
E ali logo em frente a esperar pela gente o futuro está
E o futuro é uma astronave que tentamos pilotar
Não tem tempo nem piedade, nem tem hora de chegar
Sem pedir licença muda nossa vida
E depois convida a rir ou chorar

Nessa estrada não nos cabe conhecer ou ver o que virá
O fim dela ninguém sabe bem ao certo onde vai dar
Vamos todos numa linda passarela
De uma aquarela que um dia enfim descolorirá`
  },
  {
    id: "garota-de-ipanema",
    title: "Garota de Ipanema",
    artist: "Tom Jobim & Vinicius de Moraes",
    genre: "bossa",
    year: 1962,
    views: 2380,
    featured: true,
    createdAt: "2024-01-12",
    lyrics: `Olha que coisa mais linda, mais cheia de graça
É ela, a menina que vem e que passa
Num doce balanço a caminho do mar

Moça do corpo dourado, do sol de Ipanema
O seu balançado é mais que um poema
É a coisa mais linda que eu já vi passar

Ah, por que estou tão sozinho?
Ah, por que tudo é tão triste?
Ah, a beleza que existe
A beleza que não é só minha
Que também passa sozinha

Ah, se ela soubesse que quando ela passa
O mundo inteirinho se enche de graça
E fica mais lindo por causa do amor`
  },
  {
    id: "trem-das-11",
    title: "Trem das Onze",
    artist: "Adoniran Barbosa",
    genre: "samba",
    year: 1964,
    views: 1875,
    featured: true,
    createdAt: "2024-01-15",
    lyrics: `Não posso ficar nem mais um minuto com você
Sinto muito, amor, mas não pode ser
Moro em Jaçanã
Se eu perder esse trem
Que sai agora às onze horas
Só amanhã de manhã

E além disso, mulher
Tem outra coisa
Minha mãe não dorme
Enquanto eu não chegar
Sou filho único
Tenho minha casa pra olhar

Não posso ficar nem mais um minuto com você
Sinto muito, amor, mas não pode ser
Moro em Jaçanã
Se eu perder esse trem
Que sai agora às onze horas
Só amanhã de manhã`
  },
  {
    id: "evidencias",
    title: "Evidências",
    artist: "Chitãozinho & Xororó",
    genre: "sertanejo",
    year: 1990,
    views: 3120,
    featured: true,
    createdAt: "2024-01-18",
    lyrics: `Quando eu digo que deixei de te amar
É porque eu te amo
Quando eu digo que não quero mais você
É porque eu te quero

Eu tenho medo de te dar meu coração
E confessar que eu estou em tuas mãos
Mas não posso imaginar
O que vai ser de mim
Se eu te perder um dia

Eu me afasto e me dedico
A outros amores
Mas não tem jeito
O meu peito não obedece
E eu volto pra você

É que você é a minha vida
A minha luz
A minha paz
É que você é a minha vida
Minha razão de viver`
  },
  {
    id: "legiao-que-voce-nao-tem",
    title: "Que País é Este",
    artist: "Legião Urbana",
    genre: "rock",
    year: 1987,
    views: 2010,
    featured: false,
    createdAt: "2024-01-20",
    lyrics: `Nas favelas, no Senado
Sujeira pra todo lado
Ninguém respeita a Constituição
Mas todos acreditam no futuro da nação

Que país é este?

No Amazonas, no Araguaia, na Baixada Fluminense
Mato Grosso, Minas Gerais e no Nordeste tudo em paz
Na morte eu descanso, mas o sangue anda solto
Manchando os papéis, documentos fiéis
Ao descanso do patrão

Que país é este?

Terceiro mundo se for
Piada no exterior
Mas o Brasil vai ficar rico
Vamos faturar um milhão
Quando vendermos todas as almas
Dos nossos índios num leilão

Que país é este?`
  },
  {
    id: "baiao-de-dois",
    title: "Baião de Dois",
    artist: "Luiz Gonzaga",
    genre: "forro",
    year: 1958,
    views: 940,
    featured: false,
    createdAt: "2024-01-22",
    lyrics: `Quando o inverno vai embora
E o verão vem chegando
O sertão fica florido
E o povo vai dançando

Baião de dois é a mistura
Do arroz com o feijão
É a comida do matuto
Que trabalha no sertão

Dança, dança, sanfoneiro
Que a poeira vai subir
É a festa do Nordeste
Que não pode ter fim`
  },
  {
    id: "pais-e-filhos",
    title: "Como É Grande o Meu Amor por Você",
    artist: "Roberto Carlos",
    genre: "pop",
    year: 1968,
    views: 2650,
    featured: true,
    createdAt: "2024-01-25",
    lyrics: `Eu tenho tanto pra lhe falar
Mas com palavras não sei dizer
Como é grande o meu amor por você

E não há nada pra comparar
Para poder lhe explicar
Como é grande o meu amor por você

Nem mesmo o céu, nem as estrelas
Nem mesmo o mar e o infinito
Não é maior que o meu amor
Nem mais bonito

Me desespero a procurar
Alguma forma de lhe falar
Como é grande o meu amor por você

Nunca se esqueça, nem um segundo
Que eu tenho o amor maior do mundo
Como é grande o meu amor por você`
  },
  {
    id: "asa-branca",
    title: "Asa Branca",
    artist: "Luiz Gonzaga",
    genre: "forro",
    year: 1947,
    views: 1780,
    featured: false,
    createdAt: "2024-01-28",
    lyrics: `Quando olhei a terra ardendo
Qual fogueira de São João
Eu perguntei a Deus do céu, ai
Por que tamanha judiação

Que braseiro, que fornalha
Nem um pé de plantação
Por falta d'água perdi meu gado
Morreu de sede meu alazão

Até mesmo a asa branca
Bateu asas do sertão
Então eu disse, adeus, Rosinha
Guarda contigo meu coração

Hoje longe, muitas léguas
Numa triste solidão
Espero a chuva cair de novo
Pra mim voltar pro meu sertão`
  },
  {
    id: "vou-te-esquecer",
    title: "Sina",
    artist: "Djavan",
    genre: "mpb",
    year: 1982,
    views: 1340,
    featured: false,
    createdAt: "2024-02-01",
    lyrics: `Sina, sina minha
Sina de viver assim
Toda vontade é pouca
Quando se quer ser feliz

Vem, me leva contigo
Que eu vou sem pensar
O teu destino é o meu abrigo
É o meu lugar

Sina, sina minha
Sina de amar demais
A vida é longa e a gente
Quer só viver em paz`
  },
  {
    id: "o-veado",
    title: "O Veado",
    artist: "Domínio Popular",
    genre: "folclore",
    year: 1950,
    views: 420,
    featured: false,
    createdAt: "2024-02-05",
    lyrics: `Lá no meio do pasto
Pastava um veado
Comendo capim
Correndo no prado

Ele tinha um chifre
Que era bem dourado
Ninguém conseguia
Pegar o danado

Cantiga de roda
Que o povo entoa
Passando de geração
Pra geração à toa`
  },
  {
    id: "when-the-saints",
    title: "When the Saints Go Marching In",
    artist: "Tradicional",
    genre: "gospel",
    year: 1940,
    views: 1120,
    featured: false,
    createdAt: "2024-02-08",
    lyrics: `Oh, when the saints go marching in
Oh, when the saints go marching in
Lord, I want to be in that number
When the saints go marching in

Oh, when the sun refuse to shine
Oh, when the sun refuse to shine
Lord, I want to be in that number
When the sun refuse to shine

Oh, when the moon goes down in blood
Oh, when the moon goes down in blood
Lord, I want to be in that number
When the moon goes down in blood

Oh, when the new world is revealed
Oh, when the new world is revealed
Lord, I want to be in that number
When the new world is revealed`
  },
  {
    id: "blues-da-piedade",
    title: "Blues da Piedade",
    artist: "Cazuza",
    genre: "blues",
    year: 1990,
    views: 1505,
    featured: false,
    createdAt: "2024-02-11",
    lyrics: `A gente corre pra não chegar
A gente chega pra não ficar
A gente fica pra não perder
A gente perde pra não sofrer

Blues da piedade, blues do adeus
A vida é um blues que a gente canta só

A gente briga porque ama
A gente ama porque precisa
A gente precisa porque teme
A gente teme porque é só`

  }
];

/* Converte o catálogo para o formato usado pela loja (ids de datas etc.) */
(function normalizeSongs() {
  SONGS.forEach(function (song, index) {
    song.currentViews = song.views;
    song.gradient = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
    song.cover = song.cover || "";
    song.audio = song.audio || "";
    song.bpm = song.bpm || 0;
  });
})();

/* Helpers de acesso */
function getGenreName(genreId) {
  const genre = GENRES.find(function (g) { return g.id === genreId; });
  return genre ? genre.name : "Outros";
}

function findBaseSong(id) {
  return SONGS.find(function (s) { return s.id === id; }) || null;
}
