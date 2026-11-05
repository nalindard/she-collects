# Contributing to Error Monitoring System

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node/Bun version, etc.)
- Error messages and logs

### Suggesting Features

Feature requests are welcome! Please create an issue with:

- Clear description of the feature
- Use case and benefits
- Proposed implementation (optional)

### Submitting Code

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**
   ```bash
   ./test-setup.sh
   npm run server  # Test the server
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add new feature"
   ```

   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `test:` for tests
   - `chore:` for maintenance

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Describe what your PR does
   - Reference any related issues
   - Include screenshots if relevant

## Development Setup

### Prerequisites

- Bun 1.2.18+ or Node.js 18+
- Git
- GitHub account

### Local Setup

```bash
# Clone your fork
git clone https://github.com/your-username/she-collects.git
cd she-collects

# Install dependencies
bun install  # or npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
# Edit .env with your credentials

# Run tests
./test-setup.sh

# Start development server
bun run server:dev
```

## Code Style

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Add type annotations for public APIs
- Use interfaces for complex types

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (prefixed with `I` if needed)

### Code Organization

```
src/
  ├── config.ts           # Configuration
  ├── index.ts            # CLI entry point
  ├── server.ts           # Server entry point
  ├── types/              # TypeScript types
  ├── services/           # Business logic
  ├── handlers/           # Request handlers
  └── utils/              # Utility functions
```

## Testing

### Manual Testing

```bash
# Test configuration
./test-setup.sh

# Test server
bun run server

# Test webhooks
curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d @examples/slack-webhook-example.json
```

### Future: Automated Tests

We plan to add:
- Unit tests with Bun test runner
- Integration tests
- E2E tests

## Documentation

When adding features, update:

- `README.md` - If it affects setup or usage
- `INTEGRATION.md` - If adding new integrations
- `DEPLOYMENT.md` - If adding deployment options
- `ARCHITECTURE.md` - If changing architecture
- Code comments - For complex logic

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style
- [ ] TypeScript compiles without errors
- [ ] Tested manually
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No unnecessary files committed

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Other (please describe)

## Testing
Describe how you tested your changes

## Related Issues
Fixes #123
```

## Review Process

1. Maintainers will review your PR
2. Address any feedback
3. Once approved, PR will be merged
4. Your contribution will be credited

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Other unprofessional conduct

## Questions?

- Open an issue for questions
- Check existing documentation
- Review closed issues for similar problems

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
