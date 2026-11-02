from dataclasses import replace

from ..domain.entities import Category, TxType
from ..domain.exceptions import CategoryHasTransactions, EntityNotFound
from .ports import UnitOfWorkFactory

NOT_FOUND = "Categoría no encontrada"


class ListCategories:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int) -> list[Category]:
        with self._uow_factory() as uow:
            return uow.categories.list(user_id)


class CreateCategory:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, name: str, type: TxType, color: str) -> Category:
        with self._uow_factory() as uow:
            category = uow.categories.add(Category(id=None, user_id=user_id, name=name, type=type, color=color))
            uow.commit()
        return category


class UpdateCategory:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, category_id: int, name: str, type: TxType, color: str) -> Category:
        with self._uow_factory() as uow:
            current = uow.categories.get(user_id, category_id)
            if not current:
                raise EntityNotFound(NOT_FOUND)
            if type != current.type and uow.categories.has_transactions(category_id):
                raise CategoryHasTransactions()
            category = uow.categories.update(replace(current, name=name, type=type, color=color))
            uow.commit()
        return category


class DeleteCategory:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, category_id: int) -> None:
        with self._uow_factory() as uow:
            if not uow.categories.get(user_id, category_id):
                raise EntityNotFound(NOT_FOUND)
            uow.categories.delete(user_id, category_id)
            uow.commit()
