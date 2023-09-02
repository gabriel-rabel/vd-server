import { Schema, model} from "mongoose"

const jobSchema = new Schema({
    title: {type: String, required: true},
    description: {type: String, require: true},
    salary: {type: String, required: true},
    business: {type: Schema.Types.ObjectId, ref: "Business", required: true},
    status: {type: String, enum: ["ABERTA", "FECHADA", "CANCELADA"], default: "ABERTA"},
    city: {type: String, required: true},
    state: {type: String, required: true},
    candidates: [ {type: Schema.Types.ObjectId, ref: "User"} ],
    select_candidate: {type: Schema.Types.ObjectId, ref: "User"},
    model: {type: String, enum:["REMOTO", "HIBRIDO", "PRESENCIAL"]},
    

},
{ timestamps: true }
);

export default model("Job", jobSchema);

