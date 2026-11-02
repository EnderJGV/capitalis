from .entities import TxType

# (name, type, color) created for every new user
DEFAULT_CATEGORIES: list[tuple[str, TxType, str]] = [
    ("Salario", "income", "#16a34a"),
    ("Otros ingresos", "income", "#0d9488"),
    ("Alimentación", "expense", "#f97316"),
    ("Transporte", "expense", "#3b82f6"),
    ("Vivienda", "expense", "#8b5cf6"),
    ("Ocio", "expense", "#ec4899"),
    ("Salud", "expense", "#ef4444"),
    ("Otros gastos", "expense", "#6b7280"),
]
