"""
Sumtech PM2510TH-OD sensor driver (Modbus RTU via USB-RS485 adapter)

Registers (function code 3, holding register):
  0x0000  Humidity      (raw / 10 = %RH)
  0x0001  Temperature   (raw / 10 = °C, signed int16)
  0x0002  PM1           (raw = ug/m3)
  0x0003  PM2.5         (raw = ug/m3)
  0x0004  PM10          (raw = ug/m3)

Important: iocrest USB-RS485 adapter (FTDI FT231X chip) echoes TX back to RX.
→ must set `handle_local_echo = True` else CRC error on every read.
"""

import minimalmodbus
import serial
import logging
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# ── Outcome enum (string for MQTT serialization) ─────────
class Outcome:
    OK            = "ok"            # อ่านสำเร็จ + ค่าผ่าน validate
    TIMEOUT       = "timeout"       # sensor ไม่ตอบใน timeout
    CRC_ERROR     = "crc_error"     # response CRC ผิด (electrical noise / wiring issue)
    OUT_OF_RANGE  = "out_of_range"  # ค่าอ่านได้แต่นอก spec
    SERIAL_ERROR  = "serial_error"  # serial port หาย / USB unplug
    UNKNOWN       = "unknown"       # exception อื่นที่ไม่คาดคิด


@dataclass
class ReadResult:
    """ผลของการอ่าน sensor — ใช้ exhaustively (ทุก case จะ match กับ outcome เดียว)"""
    outcome: str                        # one of Outcome.*
    data: dict | None = None            # populated เมื่อ outcome == OK
    error: str | None = None            # human-readable, สำหรับ logging + alert


def _to_signed16(raw: int) -> int:
    return raw if raw < 32768 else raw - 65536


def _validate(humidity: float, temperature: float, pm25: int, pm10: int, pm1: int) -> bool:
    if not (0 <= humidity <= 100): return False
    if not (-40 <= temperature <= 80): return False
    if not (0 <= pm25 <= 1000): return False
    if not (0 <= pm10 <= 1000): return False
    if not (0 <= pm1 <= 1000): return False
    return True


class PM2510Sensor:
    def __init__(
        self,
        device: str = "/dev/ttyUSB0",
        slave_id: int = 1,
        baudrate: int = 9600,
        timeout: float = 1.5,
        retries: int = 3,
        retry_delay: float = 0.3,
    ):
        self.device      = device
        self.slave_id    = slave_id
        self.baudrate    = baudrate
        self.timeout     = timeout
        self.retries     = retries
        self.retry_delay = retry_delay
        self._instrument: minimalmodbus.Instrument | None = None

    def _connect(self) -> minimalmodbus.Instrument:
        if self._instrument is not None:
            return self._instrument
        inst = minimalmodbus.Instrument(self.device, self.slave_id)
        inst.serial.baudrate = self.baudrate
        inst.serial.bytesize = 8
        inst.serial.parity   = "N"
        inst.serial.stopbits = 1
        inst.serial.timeout  = self.timeout
        inst.mode = minimalmodbus.MODE_RTU
        inst.handle_local_echo = True   # ⭐ iocrest FTDI echoes TX
        self._instrument = inst
        return inst

    def _close_instrument(self) -> None:
        if self._instrument is not None:
            try:
                self._instrument.serial.close()
            except Exception:
                pass
            self._instrument = None

    def _read_once(self) -> list[int]:
        inst = self._connect()
        return inst.read_registers(0, 5, functioncode=3)

    def _classify_error(self, e: Exception) -> tuple[str, str]:
        """Map exception → (outcome, error_msg)"""
        msg = f"{type(e).__name__}: {e}"
        if isinstance(e, minimalmodbus.NoResponseError):
            return Outcome.TIMEOUT, msg
        if isinstance(e, minimalmodbus.InvalidResponseError):
            return Outcome.CRC_ERROR, msg
        if isinstance(e, (serial.SerialException, OSError, FileNotFoundError)):
            return Outcome.SERIAL_ERROR, msg
        return Outcome.UNKNOWN, msg

    def read(self) -> ReadResult:
        """
        อ่าน sensor 1 ครั้ง พร้อม retry — return ReadResult ที่บอก outcome ชัดเจน
        Caller ใช้ result.outcome เพื่อ track stat + result.data เมื่อ outcome==OK
        """
        last_outcome = Outcome.UNKNOWN
        last_error   = "no attempt"

        for attempt in range(1, self.retries + 1):
            try:
                vals = self._read_once()
                humidity    = vals[0] / 10
                temperature = _to_signed16(vals[1]) / 10
                pm1, pm25, pm10 = vals[2], vals[3], vals[4]

                if not _validate(humidity, temperature, pm25, pm10, pm1):
                    err = f"H={humidity} T={temperature} PM2.5={pm25} PM10={pm10} PM1={pm1}"
                    logger.warning("sensor out-of-range: %s", err)
                    return ReadResult(outcome=Outcome.OUT_OF_RANGE, error=err)

                return ReadResult(
                    outcome=Outcome.OK,
                    data={
                        "humidity":    round(humidity, 1),
                        "temperature": round(temperature, 1),
                        "pm1":         pm1,
                        "pm25":        pm25,
                        "pm10":        pm10,
                    },
                )
            except Exception as e:
                last_outcome, last_error = self._classify_error(e)
                logger.warning(
                    "sensor read attempt %d/%d failed (%s): %s",
                    attempt, self.retries, last_outcome, last_error,
                )
                self._close_instrument()   # serial port อาจ stuck → เปิดใหม่
                if attempt < self.retries:
                    time.sleep(self.retry_delay)

        logger.error("sensor read failed after %d attempts: %s", self.retries, last_error)
        return ReadResult(outcome=last_outcome, error=last_error)

    def close(self) -> None:
        self._close_instrument()
