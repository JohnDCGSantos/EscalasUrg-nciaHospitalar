const { Schema, model } = require('mongoose')

const doctorSchema = new Schema(
  {
    nome: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    historicoFerias: [
      {
        dataInicio: {
          type: Date,
        },
        dataFim: {
          type: Date,
        },
      },
    ],
    diasDeFerias: [Date],
  },
  {
    timestamps: true,
  }
)

const Doctor = model('Doctor', doctorSchema)

module.exports = Doctor
