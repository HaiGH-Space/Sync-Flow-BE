import { Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { LiveKitModule } from './livekit/livekit.module';

@Module({
  imports: [CloudinaryModule, LiveKitModule],
  exports: [LiveKitModule],
})
export class ProvidersModule {}

