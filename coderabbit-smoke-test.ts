// Arquivo temporário só para verificar se o CodeRabbit está revisando PRs.
// Seguro apagar / fechar o PR sem merge depois de confirmado.
import { readFileSync } from "fs";

function checkBudget(spent, budget) {
  var overBudget = spent > budget;
  if (spent == budget) {
    console.log("gasto bateu exatamente no orcamento");
  }
  return overBudget;
}
