"""Pruebas de la lógica de recordatorios (sin enviar correos)."""
from datetime import datetime, timedelta
from unittest import TestCase

from recordatorios_logic import (
    CR_TZ,
    MAX_SEGUNDOS_ANTES_UNA_HORA,
    MIN_SEGUNDOS_ANTES_UNA_HORA,
    debe_enviar_1h,
    debe_enviar_dia_previo,
    parse_cita_cr,
)


class ParseCitaTests(TestCase):
    def test_parse_formato_reserva(self):
        d = parse_cita_cr("08/05/2026", "5:00 PM")
        self.assertIsNotNone(d)
        assert d is not None
        self.assertEqual(d.tzinfo, CR_TZ)
        self.assertEqual(d, datetime(2026, 5, 8, 17, 0, tzinfo=CR_TZ))

    def test_parse_am_medianoche(self):
        d = parse_cita_cr("1/1/2026", "12:00 AM")
        self.assertIsNotNone(d)
        assert d is not None
        self.assertEqual(d.hour, 0)


class DiaPrevioTests(TestCase):
    def test_envia_dia_anterior_a_las_14_cr(self):
        cita = datetime(2026, 5, 15, 10, 0, tzinfo=CR_TZ)
        ahora = datetime(2026, 5, 14, 14, 30, tzinfo=CR_TZ)
        self.assertTrue(debe_enviar_dia_previo(ahora, cita, ya_enviado=False))

    def test_no_envia_antes_de_las_14(self):
        cita = datetime(2026, 5, 15, 10, 0, tzinfo=CR_TZ)
        ahora = datetime(2026, 5, 14, 13, 59, tzinfo=CR_TZ)
        self.assertFalse(debe_enviar_dia_previo(ahora, cita, ya_enviado=False))

    def test_no_envia_otro_dia(self):
        cita = datetime(2026, 5, 15, 10, 0, tzinfo=CR_TZ)
        ahora = datetime(2026, 5, 13, 14, 0, tzinfo=CR_TZ)
        self.assertFalse(debe_enviar_dia_previo(ahora, cita, ya_enviado=False))

    def test_dia_previo_tarde_si_deploy_cayo(self):
        cita = datetime(2026, 5, 15, 10, 0, tzinfo=CR_TZ)
        ahora = datetime(2026, 5, 14, 18, 0, tzinfo=CR_TZ)
        self.assertTrue(debe_enviar_dia_previo(ahora, cita, ya_enviado=False))

    def test_no_duplica_si_ya_enviado(self):
        cita = datetime(2026, 5, 15, 10, 0, tzinfo=CR_TZ)
        ahora = datetime(2026, 5, 14, 14, 45, tzinfo=CR_TZ)
        self.assertFalse(debe_enviar_dia_previo(ahora, cita, ya_enviado=True))


class UnaHoraTests(TestCase):
    def _cita_same_day(self):
        return datetime(2026, 5, 20, 17, 0, tzinfo=CR_TZ)

    def test_ventana_tipica_entra(self):
        cita = self._cita_same_day()
        # 62 min antes
        ahora = cita - timedelta(minutes=62)
        self.assertTrue(debe_enviar_1h(ahora, cita, ya_enviado=False))

    def test_demasiado_temprano(self):
        cita = self._cita_same_day()
        ahora = cita - timedelta(minutes=70)
        self.assertFalse(debe_enviar_1h(ahora, cita, ya_enviado=False))

    def test_demasiado_tarde(self):
        cita = self._cita_same_day()
        ahora = cita - timedelta(minutes=50)
        self.assertFalse(debe_enviar_1h(ahora, cita, ya_enviado=False))

    def test_bordes_52_y_68_min(self):
        cita = self._cita_same_day()
        self.assertFalse(
            debe_enviar_1h(cita - timedelta(minutes=51), cita, False)
        )  # 51 < 52 min
        self.assertTrue(debe_enviar_1h(cita - timedelta(minutes=52), cita, False))
        self.assertTrue(debe_enviar_1h(cita - timedelta(minutes=68), cita, False))
        self.assertFalse(
            debe_enviar_1h(cita - timedelta(minutes=69), cita, False)
        )

    def test_no_duplica(self):
        cita = self._cita_same_day()
        ahora = cita - timedelta(minutes=60)
        self.assertFalse(debe_enviar_1h(ahora, cita, ya_enviado=True))


class ConstantesTests(TestCase):
    def test_ventana_cubre_con_tick_3_min(self):
        self.assertGreater(
            MAX_SEGUNDOS_ANTES_UNA_HORA - MIN_SEGUNDOS_ANTES_UNA_HORA, 3 * 60
        )
