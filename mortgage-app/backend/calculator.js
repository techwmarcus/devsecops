export const calculationLimits = {
  annualSalary: { min: 1, max: 100_000_000 },
  homePrice: { min: 1, max: 100_000_000 },
  downPaymentPercent: { min: 0, max: 95 },
  interestRatePercent: { min: 0, max: 25 },
  termYears: { min: 1, max: 50 },
};

export const affordabilityIncomePercent = 28;

function isValidNumber(value, { min, max }) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function monthlyMortgagePayment(principal, monthlyRate, numberOfPayments) {
  if (monthlyRate === 0) {
    return principal / numberOfPayments;
  }
  return (
    (principal * monthlyRate) /
    (1 - (1 + monthlyRate) ** -numberOfPayments)
  );
}

function loanAmountForPayment(payment, monthlyRate, numberOfPayments) {
  if (monthlyRate === 0) {
    return payment * numberOfPayments;
  }
  return (
    (payment * (1 - (1 + monthlyRate) ** -numberOfPayments)) /
    monthlyRate
  );
}

export function calculateAffordability(input) {
  const errors = {};

  if (!["salary-to-price", "price-to-salary"].includes(input.calculationType)) {
    errors.calculationType = "Choose a supported calculation type.";
  }

  for (const field of ["downPaymentPercent", "interestRatePercent", "termYears"]) {
    if (!isValidNumber(input[field], calculationLimits[field])) {
      errors[field] = `Enter a value between ${calculationLimits[field].min} and ${calculationLimits[field].max}.`;
    }
  }

  if (
    input.calculationType === "salary-to-price" &&
    !isValidNumber(input.annualSalary, calculationLimits.annualSalary)
  ) {
    errors.annualSalary = "Enter an annual salary greater than zero.";
  }

  if (
    input.calculationType === "price-to-salary" &&
    !isValidNumber(input.homePrice, calculationLimits.homePrice)
  ) {
    errors.homePrice = "Enter a home price greater than zero.";
  }

  if (
    typeof input.termYears === "number" &&
    !Number.isInteger(input.termYears)
  ) {
    errors.termYears = "Enter a whole number of years.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const roundToCents = (amount) => Math.round(amount * 100) / 100;
  const monthlyInterestRate = input.interestRatePercent / 100 / 12;
  const numberOfPayments = input.termYears * 12;
  const downPaymentFraction = input.downPaymentPercent / 100;

  if (input.calculationType === "salary-to-price") {
    const monthlyPaymentBudget =
      (input.annualSalary / 12) * (affordabilityIncomePercent / 100);
    const maxLoanAmount = loanAmountForPayment(
      monthlyPaymentBudget,
      monthlyInterestRate,
      numberOfPayments,
    );
    const maxHomePrice = maxLoanAmount / (1 - downPaymentFraction);

    return {
      result: {
        annualSalary: input.annualSalary,
        downPaymentAmount: roundToCents(maxHomePrice * downPaymentFraction),
        monthlyPayment: roundToCents(monthlyPaymentBudget),
        maxLoanAmount: roundToCents(maxLoanAmount),
        maxHomePrice: roundToCents(maxHomePrice),
      },
    };
  }

  const downPaymentAmount = input.homePrice * downPaymentFraction;
  const maxLoanAmount = input.homePrice - downPaymentAmount;
  const monthlyPayment = monthlyMortgagePayment(
    maxLoanAmount,
    monthlyInterestRate,
    numberOfPayments,
  );
  const requiredAnnualSalary =
    (monthlyPayment * 12) / (affordabilityIncomePercent / 100);

  return {
    result: {
      annualSalary: roundToCents(requiredAnnualSalary),
      downPaymentAmount: roundToCents(downPaymentAmount),
      monthlyPayment: roundToCents(monthlyPayment),
      maxLoanAmount: roundToCents(maxLoanAmount),
      maxHomePrice: roundToCents(input.homePrice),
    },
  };
}
