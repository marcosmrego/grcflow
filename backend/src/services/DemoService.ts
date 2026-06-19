import { AuthService } from './AuthService';
import { userRepository } from '../repositories/UserRepository';
import { companyRepository } from '../repositories/CompanyRepository';
import { UserPayload } from '../models/types';
import { NotFoundError } from '../middleware';

const DEMO_USER_EMAIL = 'demo@grcflow.local';

interface DemoLoginResponse {
  token: string;
  user: UserPayload & { isDemo: true };
}

/**
 * Demo Service
 * Issues short-lived access to the public demo company (Empresa Demo) for the marketing
 * landing page — no credentials involved, see POST /api/demo/login. The session can create
 * and edit content and decide approval alçadas, but never manage users/roles (see
 * AuthService.generateDemoAccessToken for how that's enforced).
 */
export class DemoService {
  async login(): Promise<DemoLoginResponse> {
    const user = await userRepository.findByEmail(DEMO_USER_EMAIL);
    if (!user || !user.is_active) {
      throw new NotFoundError('Demo');
    }

    const company = await companyRepository.findById(user.company_id);
    if (!company || !company.is_active || !company.is_demo) {
      throw new NotFoundError('Demo');
    }

    const token = AuthService.generateDemoAccessToken(user);

    return {
      token,
      user: { ...AuthService.toUserPayload(user), role: 'editor', isDemo: true },
    };
  }
}

export const demoService = new DemoService();
