import Adafruit_ADS1x15

ADS = Adafruit_ADS1x15.ADS1115()

channel = int(input())
gain = float(input())

print ADS.read_adc(channel, gain=gain)