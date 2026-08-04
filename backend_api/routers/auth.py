from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from .. import models, schemas, security
from ..database import get_db as get_db_session

router = APIRouter(tags=["Autenticación"])


@router.post("/api/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_session)
):
    usuario_ingresado = form_data.username.strip()

    # Buscar en tabla de administradores
    user_admin = db.query(models.User).filter(
        func.lower(models.User.username) == func.lower(usuario_ingresado)
    ).first()

    # Si no es admin, buscar en tabla de personal
    user_personal = None
    if not user_admin:
        user_personal = db.query(models.UsuarioAcceso).filter(
            or_(
                func.lower(models.UsuarioAcceso.id_imss) == func.lower(usuario_ingresado),
                func.lower(models.UsuarioAcceso.correo) == func.lower(usuario_ingresado)
            )
        ).first()

    token_data = {}
    usuario_encontrado = None

    if user_admin:
        if not security.verify_password(form_data.password, user_admin.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
        token_data = {"sub": user_admin.username, "role": user_admin.role, "userId": user_admin.id}
        usuario_encontrado = user_admin

    elif user_personal:
        if not user_personal.estatus:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada.")
        if not security.verify_password(form_data.password, user_personal.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

        identificador = user_personal.correo if user_personal.correo else user_personal.id_imss
        token_data = {"sub": identificador, "role": user_personal.rol, "userId": user_personal.id}
        usuario_encontrado = user_personal

    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    access_token = security.create_access_token(data=token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": usuario_encontrado
    }


@router.put("/api/users/me/change-password", status_code=status.HTTP_200_OK, tags=["Usuarios"])
async def user_change_own_password(
    payload: schemas.UserChangePassword,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    if not payload.new_password or len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mínimo 8 caracteres.")

    user_to_update = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user_to_update.hashed_password = security.get_password_hash(payload.new_password)
    user_to_update.must_change_password = False

    try:
        db.commit()
        return {"detail": "Contraseña actualizada. Inicia sesión de nuevo."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al guardar.")

@router.post("/api/admin/encargados/registrar", response_model=schemas.UsuarioAccesoResponse)
async def registrar_encargado(
    usuario_in: schemas.UsuarioAccesoCreate,
    db: Session = Depends(get_db_session),
    # Protegemos la ruta para que solo los administradores generales puedan crear estos accesos
    current_user: models.User = Depends(security.get_current_user)
):
    rol_admin = getattr(current_user, "role", getattr(current_user, "rol", ""))
    if rol_admin != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para registrar encargados.")

    if usuario_in.correo:
        existe_correo = db.query(models.UsuarioAcceso).filter(
            models.UsuarioAcceso.correo == usuario_in.correo
        ).first()
        if existe_correo:
            raise HTTPException(status_code=400, detail=f"El correo '{usuario_in.correo}' ya está en uso.")

    nuevo_usuario = models.UsuarioAcceso(
        correo=usuario_in.correo,
        id_imss=None, 
        hashed_password=security.get_password_hash(usuario_in.password),
        rol=usuario_in.rol,
        estatus=usuario_in.estatus,
        clues=usuario_in.clues,
        entidad=usuario_in.entidad
    )
    
    try:
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar en la base de datos: {str(e)}")