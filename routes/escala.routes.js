const express = require('express')
const Doctor = require('../models/Doctor.model')
const Escala = require('../models/Escala.model')

const router = express.Router()

// Rota para exibir o formulário de criação da escala
router.get('/criar', async (req, res) => {
  try {
    // Consulte o banco de dados para obter a lista de médicos disponíveis
    const doctors = await Doctor.find()
    //console.log(doctors)
    res.render('escalas/nova', { doctors })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao carregar a página de criação de escala' })
  }
})
let medicosSelecionados = []
let medicosSemana = []
let semanaAtual = 0

// Rota para criar uma nova escala
// Rota para criar uma nova escala
router.post('/criar', async (req, res) => {
  try {
    const dataInicioString = req.body.dataInicio
    const dataFimString = req.body.dataFim
    const dataInicio = new Date(dataInicioString)
    const dataFim = new Date(dataFimString)

    medicosSelecionados = req.body.medicos // Atualiza os médicos selecionados

    if (!medicosSelecionados || medicosSelecionados.length < 14) {
      return res.status(400).json({ error: 'Selecione pelo menos 14 médicos para criar a escala.' })
    }

    const numDias = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24))
    const numSemanas = Math.ceil(numDias / 7)

    const escala = []

    let dataAtual = new Date(dataInicio)
    let semana = 1

    while (dataAtual <= dataFim) {
      const dataInicioSemana = new Date(dataAtual)
      const dataFimSemana = new Date(dataAtual)

      // Avance a data de término da semana com base no dia de início da escala
      const diasParaFrente = 6 - dataInicioSemana.getDay() // Dias até o próximo sábado
      dataFimSemana.setDate(dataInicioSemana.getDate() + diasParaFrente)

      if (dataFimSemana > dataFim) {
        // Se a data final da semana for maior que a data de fim, ajuste para a data de fim
        dataFimSemana.setDate(dataFim.getDate())
      }

      // Se esta é a semana final, ajuste a data de fim da semana para a data de fim
      if (dataFimSemana >= dataFim) {
        dataFimSemana.setDate(dataFim.getDate())
      }

      // Distribua os médicos para esta semana
      const medicosSemana = distribuirMedicosParaSemana(medicosSelecionados)

      // Calcula o número de dias na semana atual
      const numDiasSemana =
        Math.ceil((dataFimSemana - dataInicioSemana) / (1000 * 60 * 60 * 24)) + 1
      console.log(
        `Semana ${semana}: De ${dataInicioSemana.toDateString()} a ${dataFimSemana.toDateString()}`
      )
      console.log(`Data de término da semana: ${dataFimSemana.toDateString()}`)
      console.log(`Número de dias na semana: ${numDiasSemana}`)
      console.log(`Médicos disponíveis: ${medicosSemana.length}`)

      // Restante da lógica para criar a escala usando medicosSemana
      const escalaSemana = criarEscala(dataInicioSemana, numDiasSemana, medicosSemana)
      escala.push(...escalaSemana)

      // Avance para a próxima semana
      dataAtual = new Date(dataFimSemana)
      dataAtual.setDate(dataAtual.getDate() + 1)

      semana++
    }

    // Crie a escala no banco de dados (substitua pelo seu próprio modelo)
    const novaEscala = new Escala({
      dataInicio: new Date(dataInicioString),
      dataFim: dataFim,
      medicos: escala,
    })

    // Salve a nova escala no banco de dados
    await novaEscala.save()
    return res.render('escalas/visualizar', {
      success: {
        message: 'Escala criada com sucesso!',
        numDias: numDias,
        numSemanas: numSemanas,
      },
      escala: novaEscala,
    })
    // Redirecione para a página dos médicos
    //res.redirect('/doctors')
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao gerar a escala' })
  }
})

// Função para distribuir médicos para uma semana
function distribuirMedicosParaSemana(medicosSelecionados) {
  // Embaralhe os médicos para esta semana (ou implemente sua lógica de distribuição)
  return shuffleArray([...medicosSelecionados])
}
function criarEscala(dataInicio, numDiasSemana, medicosSemana) {
  const escala = []
  const medicosDia = []
  let dataInicialSemana = new Date(dataInicio) // Variável para controlar a data inicial da semana

  // Primeira fase: distribuir um médico de dia e um de noite para cada dia da semana
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < numDiasSemana; i++) {
      const dataAtual = new Date(dataInicialSemana)
      dataAtual.setDate(dataAtual.getDate() + i)
      console.log(`Iteração ${i + 1}: Data: ${dataAtual.toDateString()}`)
      console.log(`Médicos disponíveis: ${medicosSemana.length}`)
      // Atribua um médico de dia
      if (medicosSemana.length > 0 && j === 0) {
        const medicoDia = medicosSemana.shift()
        const [medicoID, medicoNome] = medicoDia.split(':')
        console.log(`Médico ID: ${medicoID}, Médico Nome: ${medicoNome}`)

        medicosDia.push({ medico: medicoID, dia: dataAtual, nomeMedico: medicoNome }) // Inclua a data completa
        escala.push({ turno: 'dia', medico: medicoID, dia: dataAtual, nomeMedico: medicoNome })
        console.log(`Médicos disponíveis após atribuição: ${medicosSemana.length}`)
      }

      // Atribua um médico de noite
      if (medicosSemana.length > 0 && j === 0) {
        const medicoNoite = medicosSemana.shift()
        const [medicoID, medicoNome] = medicoNoite.split(':') // Separar o ID e o nome
        console.log(`Médico ID: ${medicoID}, Médico Nome: ${medicoNome}`)

        escala.push({ turno: 'noite', medico: medicoID, dia: dataAtual, nomeMedico: medicoNome })
        console.log(`Médicos disponíveis após atribuição: ${medicosSemana.length}`)

        //console.log(`Médicos disponíveis após atribuição: ${medicosSemana.length}`)
      }
      if (medicosSemana.length > 0 && j === 1) {
        const medicoDiaExtra = medicosSemana.shift()
        const [medicoID, medicoNome] = medicoDiaExtra.split(':') // Separar o ID e o nome
        console.log(`Médico ID: ${medicoID}, Médico Nome: ${medicoNome}`)

        escala.push({
          turno: 'dia',
          medico: medicoID,
          dia: medicosDia[i].dia,
          nomeMedico: medicoNome,
        })
        console.log(`Iteração ${i + 1}: Data: ${dataAtual.toDateString()}`)

        console.log(`Médicos disponíveis após atribuição: ${medicosSemana.length}`)
      }
    }

    // Atualize a data de início para a segunda ronda
    //dataInicio.setDate(dataInicio.getDate() + numDiasSemana)
  }

  return escala
}

// Função para embaralhar um array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

router.get('/', async (req, res, next) => {
  const allEscalas = await Escala.find()

  res.render('escalas/all', { allEscalas })
})

router.get('/:escalaId', async (req, res) => {
  try {
    const escala = await Escala.findById(req.params.escalaId)
    if (!escala) {
      return res.status(404).json({ error: 'Escala não encontrada' })
    }

    res.render('escalas/visualizar', { escala })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao buscar detalhes da escala' })
  }
})

module.exports = router
