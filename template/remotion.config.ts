import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(18);
Config.setAudioCodec("aac");
Config.setAudioBitrate("320k");
Config.setPixelFormat("yuv420p");
