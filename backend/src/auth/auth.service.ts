import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('Bu e-posta adresi zaten kayıtlı');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.usersService.create({
            email: dto.email.toLowerCase(),
            password: hashedPassword,
            name: dto.name,
        });

        const payload = { sub: user._id, email: user.email };
        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        };
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Geçersiz e-posta veya şifre');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Geçersiz e-posta veya şifre');
        }

        const payload = { sub: user._id, email: user.email };
        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        };
    }
}
