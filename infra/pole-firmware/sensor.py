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
import logging
import time

logger = logging.getLogger(__name__)


def _to_signed16(raw: int) -> int:
    """Modbus register เป็น uint16 — convert เป็น signed int16 สำหรับ temp"""
    return raw if raw < 32768 else raw - 65536


def _validate(humidity: float, temperature: float, pm25: int, pm10: int, pm1: int) -> bool:
    """ตรวจ range ก่อนยอมรับ — กัน sensor ส่ง garbage"""
    if not (0 <= humidity <= 100):
        return False
    if not (-40 <= temperature <= 80):
        return False
    if not (0 <= pm25 <= 1000):
        return False
    if not (0 <= pm10 <= 1000):
        return False
    if not (0 <= pm1 <= 1000):
        return False
    return True


class PM2510Sensor:
    """
    Read sensor with retry + validation.
    instance ครั้งเดียวตอน startup, เรียก read() ทุกครั้งที่จะ publish
    """

    def __init__(
        self,
        device: str = "/dev/ttyUSB0",
        slave_id: int = 1,
        baudrate: int = 9600,
        timeout: float = 1.5,
        retries: int = 3,
        retry_delay: float = 0.3,
    ):
        self.device = device
        self.slave_id = slave_id
        self.baudrate = baudrate
        self.timeout = timeout
        self.retries = retries
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
        inst.handle_local_echo = True   # ⭐ iocrest FTDI echoes TX → strip
        self._instrument = inst
        return inst

    def _read_once(self) -> list[int]:
        """1 modbus transaction — read register 0..4 (5 registers)"""
        inst = self._connect()
        return inst.read_registers(0, 5, functioncode=3)

    def read(self) -> dict | None:
        """
        อ่าน sensor พร้อม retry — return dict ของค่าจริง หรือ None ถ้า fail ทุก retry
        Dict keys ตรงกับ MQTT payload schema (backend handle-sensor.ts):
          humidity, temperature, pm25  (required by backend)
          pm1, pm10                    (extra, backend ignore)
        """
        for attempt in range(1, self.retries + 1):
            try:
                vals = self._read_once()
                humidity    = vals[0] / 10
                temperature = _to_signed16(vals[1]) / 10
                pm1         = vals[2]
                pm25        = vals[3]
                pm10        = vals[4]
                if not _validate(humidity, temperature, pm25, pm10, pm1):
                    logger.warning(
                        "sensor out-of-range — H=%s T=%s PM2.5=%s PM10=%s PM1=%s",
                        humidity, temperature, pm25, pm10, pm1,
                    )
                    return None
                return {
                    "humidity":    round(humidity, 1),
                    "temperature": round(temperature, 1),
                    "pm1":         pm1,
                    "pm25":        pm25,
                    "pm10":        pm10,
                }
            except Exception as e:
                logger.warning(
                    "sensor read attempt %d/%d failed: %s: %s",
                    attempt, self.retries, type(e).__name__, e,
                )
                # ถ้า error ครั้งนี้น่าจะ serial-level (port หาย) → ลด instrument
                # เปิดใหม่รอบต่อไป
                if self._instrument is not None:
                    try:
                        self._instrument.serial.close()
                    except Exception:
                        pass
                    self._instrument = None
                if attempt < self.retries:
                    time.sleep(self.retry_delay)
        logger.error("sensor read failed after %d attempts", self.retries)
        return None

    def close(self) -> None:
        if self._instrument is not None:
            try:
                self._instrument.serial.close()
            except Exception:
                pass
            self._instrument = None
