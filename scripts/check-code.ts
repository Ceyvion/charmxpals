import { hashClaimCode } from '@/lib/crypto';
import { getRedis } from '@/lib/redis';

const code = process.argv[2];
if (!code) {
  console.error('Usage: tsx scripts/check-code.ts CODE');
  process.exit(1);
}

const redis = getRedis();
const key = `redeem:code:${hashClaimCode(code)}`;

redis.get(key).then((value) => {
  console.log(key, value);
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
