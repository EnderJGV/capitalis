from .entities import Language, TxType

# (name, type, color, icon) created for every new user, in the language they chose
DEFAULT_CATEGORIES: list[tuple[str, TxType, str, str]] = [
    ("Salario", "income", "#3E9A55", "💼"),
    ("Otros ingresos", "income", "#2E8B74", "💰"),
    ("Alimentación", "expense", "#D0583F", "🛒"),
    ("Transporte", "expense", "#3F74C4", "🚌"),
    ("Vivienda", "expense", "#7E62C6", "🏠"),
    ("Ocio", "expense", "#C0508F", "🎉"),
    ("Salud", "expense", "#B57A12", "💊"),
    ("Otros gastos", "expense", "#64788F", "📦"),
]

DEFAULT_CATEGORIES_BY_LANGUAGE: dict[Language, list[tuple[str, TxType, str, str]]] = {
    "es": DEFAULT_CATEGORIES,
    "pt": [
        ("Salário", "income", "#3E9A55", "💼"),
        ("Outras receitas", "income", "#2E8B74", "💰"),
        ("Alimentação", "expense", "#D0583F", "🛒"),
        ("Transporte", "expense", "#3F74C4", "🚌"),
        ("Moradia", "expense", "#7E62C6", "🏠"),
        ("Lazer", "expense", "#C0508F", "🎉"),
        ("Saúde", "expense", "#B57A12", "💊"),
        ("Outras despesas", "expense", "#64788F", "📦"),
    ],
    "en": [
        ("Salary", "income", "#3E9A55", "💼"),
        ("Other income", "income", "#2E8B74", "💰"),
        ("Groceries", "expense", "#D0583F", "🛒"),
        ("Transport", "expense", "#3F74C4", "🚌"),
        ("Housing", "expense", "#7E62C6", "🏠"),
        ("Leisure", "expense", "#C0508F", "🎉"),
        ("Health", "expense", "#B57A12", "💊"),
        ("Other expenses", "expense", "#64788F", "📦"),
    ],
}

#: Categoría de gasto donde se registran las comisiones de las transferencias (se crea si falta).
FEE_CATEGORY: dict[Language, tuple[str, str, str]] = {
    "es": ("Comisiones bancarias", "#64788F", "🏦"),
    "pt": ("Tarifas bancárias", "#64788F", "🏦"),
    "en": ("Bank fees", "#64788F", "🏦"),
}

#: Nombre de la cuenta que se crea para los movimientos anteriores a las cuentas.
MAIN_ACCOUNT_NAME: dict[Language, str] = {"es": "Cuenta principal", "pt": "Conta principal", "en": "Main account"}
