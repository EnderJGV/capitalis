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
